/**
 * RFC4180-style CSV with spreadsheet-formula neutralization; never export
 * unverified contact numbers or Personal/medical records as part of attendance.
 */
export function csvCell(value: string | number): string {
  const content = String(value)
    .replace(/\r\n?|\n/g, " ")
    .replace(/\0/g, "");
  const safe =
    /^[\s]*[=+\-@]/.test(content) || /^[\s]*[\t]/.test(content) ? "'" + content : content;
  return '"' + safe.replace(/"/g, '""') + '"';
}

export type AttendanceCsvRow = {
  date: string;
  checkedInAt: string;
  memberNumber: number;
  memberName: string;
  method: "QR" | "MANUAL";
  managerException: boolean;
};

export function attendanceToCsv(rows: readonly AttendanceCsvRow[]): string {
  const header = [
    "Club day",
    "Checked in (UTC)",
    "Member number",
    "Member",
    "Method",
    "Manager exception",
  ];
  const data = rows.map((row) => [
    row.date,
    row.checkedInAt,
    row.memberNumber,
    row.memberName,
    row.method === "QR" ? "QR scan" : "Manual",
    row.managerException ? "Yes" : "No",
  ]);
  return [header, ...data].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
