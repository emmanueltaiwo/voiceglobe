import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily(
  'delete expired messages',
  { hourUTC: 0, minuteUTC: 0 },
  internal.messages.deleteExpiredMessages,
);

export default crons;
