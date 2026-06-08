// UK postcode: covers standard formats with or without the middle space
const POSTCODE_RE = /\b([A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2})\b/i;

// Job header: "Collect Driveable / No CC  12:00AM  12151"
const JOB_HEADER_RE = /^(Collect Driveable|Deliver Vehicle)\s*\/\s*(No CC|Deliver CC|Collect CC)/i;

// UK vehicle reg (post-2001 style most common, but also older formats)
const VEHICLE_REG_RE = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]\d{1,3}\s?[A-Z]{3}|[A-Z]{3}\s?\d{1,4}[A-Z]?|[A-Z]{2}\d{2}[A-Z]{3})\b/g;

// Day header: "Tue 05 Aug 25"
const DAY_HEADER_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})$/i;

// Date range in report header: "Between the 05 Aug 2025 and 05 Aug 2025"
const DATE_RANGE_RE = /Between the (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})/i;

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export interface ParsedJob {
  customerName: string;
  address: string;
  postcode: string;
  type: "collection" | "delivery";
  notes: string | null;
  jobDate: Date;
  sortOrder: number;
}

function parseJobDate(day: string, month: string, year: string): Date {
  const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
  return new Date(fullYear, MONTHS[month] ?? 0, parseInt(day));
}

function normalisePostcode(raw: string): string {
  const s = raw.replace(/\s+/, "").toUpperCase();
  // Insert space before the inward code (last 3 chars)
  return s.length >= 5 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
}

function parseAddress(line: string): { customerName: string; address: string; postcode: string; phone: string | null } {
  // Strip phone numbers: M:07... or T:07...
  const phoneMatch = line.match(/[MT]:(\d+)/i);
  const phone = phoneMatch ? phoneMatch[1] : null;
  let clean = line.replace(/[MT]:\d+/gi, "").replace(/,\s*$/, "").trim();

  // Remove ", GB," that Enterprise addresses include
  clean = clean.replace(/,\s*GB\s*,/gi, ",");

  const postcodeMatch = clean.match(POSTCODE_RE);
  const postcode = postcodeMatch ? normalisePostcode(postcodeMatch[1]) : "";

  // Remove the postcode from the string to get the name/address parts
  const withoutPostcode = clean.replace(POSTCODE_RE, "").replace(/,\s*$/, "").trim();
  const parts = withoutPostcode.split(",").map((p) => p.trim()).filter(Boolean);

  const customerName = parts[0] ?? "";
  const address = parts.slice(1).join(", ");

  return { customerName, address, postcode, phone };
}

export function parseDiary(rawText: string): ParsedJob[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const jobs: ParsedJob[] = [];
  let currentDate = new Date();

  // Try to pull the report date from the header
  for (const line of lines) {
    const dr = line.match(DATE_RANGE_RE);
    if (dr) {
      currentDate = parseJobDate(dr[1], dr[2], dr[3]);
      break;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Update current date from day headers
    const dayMatch = line.match(DAY_HEADER_RE);
    if (dayMatch) {
      currentDate = parseJobDate(dayMatch[2], dayMatch[3], dayMatch[4]);
      continue;
    }

    const headerMatch = line.match(JOB_HEADER_RE);
    if (!headerMatch) continue;

    const type: "collection" | "delivery" = headerMatch[1].toLowerCase().startsWith("collect")
      ? "collection"
      : "delivery";
    const ccAction = headerMatch[2]; // "No CC" | "Deliver CC" | "Collect CC"

    // Extract job ID from the header line
    const jobIdMatch = line.match(/\b(\d{4,6})\b/);
    const jobRef = jobIdMatch ? jobIdMatch[1] : null;

    // Scan the next few lines for the address (contains a postcode) and vehicle details
    let addressLine = "";
    let vehicleLine = "";
    let courtesyCarReg = "";

    // Look ahead up to 5 lines
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const next = lines[j];
      if (next.match(JOB_HEADER_RE) || next.match(DAY_HEADER_RE)) break;

      if (!addressLine && POSTCODE_RE.test(next)) {
        addressLine = next;
        continue;
      }

      // Vehicle line: should contain a reg + make/model + insurer
      // Heuristic: has at least 3 uppercase "words" and contains £ or known makes
      if (!vehicleLine && addressLine && /£/.test(next)) {
        vehicleLine = next;
        continue;
      }
    }

    if (!addressLine) continue; // couldn't parse — skip

    const { customerName, address, postcode, phone } = parseAddress(addressLine);

    // Extract courtesy car reg from vehicle line
    // Format: "VEH_REG MAKE MODEL C/CAR_REG EXCESS INSURER" or "VEH_REG MAKE MODEL EXCESS INSURER"
    let vehicleReg = "";
    let make = "";
    let model = "";
    let excess = "";
    let insurer = "";

    if (vehicleLine) {
      const tokens = vehicleLine.split(/\s+/);
      vehicleReg = tokens[0] ?? "";

      // Find excess (£...)
      const excessIdx = tokens.findIndex((t) => t.startsWith("£"));
      if (excessIdx >= 0) {
        excess = tokens[excessIdx];
        insurer = tokens.slice(excessIdx + 1).join(" ");

        // Tokens between vehicleReg and excess are make/model and possibly courtesy car
        const middle = tokens.slice(1, excessIdx);

        // If ccAction involves a CC and middle has >=2 tokens, last token may be CC reg
        if (ccAction !== "No CC" && middle.length >= 2) {
          // CC reg is typically the last "word" in middle that looks like a reg
          const lastToken = middle[middle.length - 1];
          if (/^[A-Z]{2}\d{2}[A-Z]{3}$/.test(lastToken) || /^[A-Z]\d{1,3}[A-Z]{3}$/.test(lastToken)) {
            courtesyCarReg = lastToken;
            make = middle.slice(0, -1).join(" ");
          } else {
            make = middle.join(" ");
          }
        } else {
          make = middle.join(" ");
        }
      }
    }

    // Build notes
    const noteParts: string[] = [];
    if (jobRef) noteParts.push(`Ref: ${jobRef}`);
    if (vehicleReg) noteParts.push(`Vehicle: ${vehicleReg}`);
    if (make) noteParts.push(make);
    if (courtesyCarReg) {
      if (ccAction === "Deliver CC") noteParts.push(`Deliver courtesy car: ${courtesyCarReg}`);
      if (ccAction === "Collect CC") noteParts.push(`Collect courtesy car: ${courtesyCarReg}`);
    }
    if (excess && excess !== "£0.00") noteParts.push(`Excess: ${excess}`);
    if (insurer && insurer !== "ENTERPRISE") noteParts.push(`Insurer: ${insurer}`);
    if (phone) noteParts.push(`Tel: ${phone}`);

    jobs.push({
      customerName: customerName || "Unknown",
      address: address || addressLine,
      postcode,
      type,
      notes: noteParts.length > 0 ? noteParts.join(" | ") : null,
      jobDate: new Date(currentDate),
      sortOrder: jobs.length,
    });
  }

  return jobs;
}
