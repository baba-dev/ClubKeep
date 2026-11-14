/** Pure, runtime-import-free policies for club-only competition queries. */
export function leaderboardWhere(clubId: string, seasonMetricId: string) {
  return {
    clubId,
    seasonMetricId,
    member: {
      is: {
        status: "ACTIVE" as const,
        membership: { is: { role: "MEMBER" as const, status: "ACTIVE" as const } },
        rankingConsent: { is: { enabled: true } },
      },
    },
  };
}
export const leaderboardOrder = [
  { value: "desc" as const },
  { approvedAt: "asc" as const },
  { memberRecordId: "asc" as const },
];

export function attendanceProgressWhere(
  clubId: string,
  memberRecordId: string,
  from: Date,
  endAt: Date
) {
  return { clubId, memberRecordId, checkedInAt: { gte: from, lt: endAt } };
}
export function approvedScoreProgressWhere(
  clubId: string,
  memberRecordId: string,
  seasonId: string,
  from: Date,
  endAt: Date
) {
  return {
    clubId,
    memberRecordId,
    status: "APPROVED" as const,
    submittedAt: { gte: from, lt: endAt },
    seasonMetric: { seasonId },
  };
}
