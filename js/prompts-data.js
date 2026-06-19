/*
  7 IN 7 — Prompt Data
  ====================
  Pre-load upcoming prompts here. Each prompt is hidden from the page until
  its revealAt time passes. After that, it appears automatically.

  NOTE: This file is publicly served. A determined visitor could read upcoming
  prompts in browser source. That's an acceptable tradeoff for this competition.

  TIMEZONE GUIDE (all revealAt / deadline times are UTC):
    Summer (EDT, Apr–Oct): 7pm ET  = 23:00 UTC
    Winter (EST, Nov–Mar): 7pm ET  = 00:00 UTC (next day)

  TO ADD A NEW CYCLE:
    1. Copy the template below and fill in the fields.
    2. Commit and push — the prompt stays hidden until revealAt passes.

  TO RECORD RESULTS:
    Fill in the winners object after the 22nd. Null fields are simply hidden.

  TEMPLATE:
  {
    cycle:    'Month YYYY — Cycle ##',
    month:    'Month YYYY',
    revealAt: 'YYYY-MM-DDTHH:MM:00Z',
    deadline: 'YYYY-MM-DDTHH:MM:00Z',
    text:     'The prompt text goes here.',
    winners: {
      first:  null,   // { name: 'Writer Name', title: 'Script Title' }
      second: null,
      third:  null,
    },
  },
*/

const PROMPTS = [
  {
    cycle:    'July 2026 — Cycle 01',
    month:    'July 2026',
    revealAt: '2026-07-07T23:00:00Z',   // 7pm EDT
    deadline: '2026-07-14T23:00:00Z',   // 7pm EDT
    text:     'Two people share a meal for the last time — but only one of them knows it.',
    winners: {
      first:  null,
      second: null,
      third:  null,
    },
  },

  // Add future cycles below this line:

];
