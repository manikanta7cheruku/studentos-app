// Where a notification leads. Shared by the Updates page and by phone alerts, so both open the same place.
export function notificationHref(
  item: { type: string; payload: Record<string, unknown> },
  slug: string,
): string | null {
  const base = `/c/${slug}`;
  if (item.type === "announcement.published") return `${base}/campus`;
  if (item.type.startsWith("team.")) {
    const postId = item.payload.post_id;
    return typeof postId === "string" ? `${base}/collaborate/${postId}` : `${base}/collaborate`;
  }
  if (item.type.startsWith("venue.")) {
    const venueId = item.payload.venue_id;
    // The manager answers on the venue page, the person who asked sees it in My bookings.
    if (item.type === "venue.booking_requested" || item.type === "venue.booking_cancelled")
      return typeof venueId === "string" ? `${base}/turf/${venueId}` : `${base}/turf`;
    return `${base}/turf/bookings`;
  }
  if (item.type === "dm.received") {
    const from = item.payload.from;
    return typeof from === "string" ? `${base}/messages/${from}` : `${base}/messages`;
  }
  if (item.type === "debate.invited") {
    const debateId = item.payload.debate_id;
    return typeof debateId === "string" ? `${base}/debates/${debateId}` : `${base}/debates`;
  }
  // Own content removed, warned about or actioned: the page where the rules can be read.
  if (
    item.type === "content.removed" ||
    item.type.startsWith("moderation.") ||
    item.type === "report.actioned"
  )
    return "/safety";
  if (item.type === "opportunity.deadline_soon") return `${base}/career`;
  if (item.type.startsWith("membership.")) return `${base}/me`;
  return null;
}
