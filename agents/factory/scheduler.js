/**
 * 7-day Instagram content schedule from playbooks/organic/instagram.md.
 * Day numbers: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun.
 */
const SCHEDULE = [
  null, // index 0 unused
  { day: 1, type: 'reel',         theme: 'Showcase',          subtheme: 'transformation, reveal, results' },
  { day: 2, type: 'carousel',     theme: 'Education',         subtheme: 'tips, guides, cost info, comparisons' },
  { day: 3, type: 'story',        theme: 'Behind-the-scenes', subtheme: 'process, team, work in progress' },
  { day: 4, type: 'single_image', theme: 'Trust',             subtheme: 'client review, detail shot, differentiation' },
  { day: 5, type: 'reel',         theme: 'Showcase',          subtheme: 'timelapse, close-up, day-in-the-life' },
  { day: 6, type: 'carousel',     theme: 'Education/Trust',   subtheme: 'FAQ, process breakdown, common mistakes' },
  { day: 7, type: 'story',        theme: 'Engagement',        subtheme: 'A vs B, mood board, poll' },
];

/**
 * Get schedule day (1=Mon..7=Sun) for the current date.
 * Respects TZ env var set in .env.
 */
export function getScheduleDay() {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon..6=Sat
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Get content assignment for a given day number (1-7).
 */
export function getContentAssignment(dayNumber) {
  if (dayNumber < 1 || dayNumber > 7) throw new Error(`Invalid day: ${dayNumber}`);
  return SCHEDULE[dayNumber];
}

/**
 * Get today's content assignment.
 */
export function getTodayAssignment() {
  return getContentAssignment(getScheduleDay());
}

/**
 * Get all 7 day assignments (for --week mode).
 */
export function getWeekAssignments() {
  return SCHEDULE.slice(1);
}
