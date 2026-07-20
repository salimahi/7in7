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
    Winners (and the winner graphic) only appear once the cycle lands in the
    Archive — i.e. once its deadline has passed — regardless of when you fill
    them in.

  IMAGE:
    Optional. Save the thumbnail under img/prompts/, named by cycle
    (e.g. img/prompts/2026-07.jpg), and set the image field to that path.
    Like everything else here, it stays hidden until revealAt passes.

  WINNER GRAPHIC:
    Optional. Save under img/prompts/winners/, named by cycle
    (e.g. img/prompts/winners/2026-07.jpg), and set winnerImage to that path.
    Shows in the Past Prompts archive card alongside the winners list.

  RESULTS REVEAL:
    Optional. Set resultsRevealAt (ISO UTC, same format as revealAt/deadline)
    to control exactly when winners + winnerImage become visible. Until that
    time, the cycle shows with no winners at all, even after its deadline has
    passed. If omitted, winners appear as soon as the deadline passes.

  TYPE:
    Optional. Free-text tag (e.g. 'Dialogue Prompt', 'Visual Prompt',
    'Genre Bender'). Shown as a badge next to the Open/Closed status,
    on both the current prompt and archive cards.

  TEMPLATE:
  {
    cycle:           'Month YYYY | Cycle ##',
    month:           'Month YYYY',
    revealAt:        'YYYY-MM-DDTHH:MM:00Z',
    deadline:        'YYYY-MM-DDTHH:MM:00Z',
    resultsRevealAt: null,   // e.g. 'YYYY-MM-DDTHH:MM:00Z' — gates winner reveal
    text:            'The prompt text goes here.',
    type:            null,   // e.g. 'Dialogue Prompt'
    image:           null,   // e.g. 'img/prompts/2026-07.jpg'
    winnerImage:     null,   // e.g. 'img/prompts/winners/2026-07.jpg'
    winners: {
      first:  null,   // { name: 'Writer Name', title: 'Script Title', instagram: 'handle' }
      second: null,   // instagram is optional; when set, it's linked to instagram.com/<handle>
      third:  null,
    },
  },
*/

const PROMPTS = [
  {
    cycle:           'July 2026 | Cycle 01',
    month:           'July 2026',
    revealAt:        '2026-07-07T23:00:00Z',   // 7pm EDT
    deadline:        '2026-07-14T23:00:00Z',   // 7pm EDT
    resultsRevealAt: '2026-07-22T23:00:00Z',   // 7pm EDT
    text:            'A photo of a phonebooth at night.',
    type:            'Photo Prompt',
    image:           'img/prompts/2026-07.jpg',
    winnerImage:     'img/prompts/winners/2026-07.png',
    winners: {
      first:  { name: 'Steve Rodgers', title: 'Seven Minutes, One Chance' },
      second: { name: 'John Searson',  title: 'For Me?', instagram: 'JSearsonJr' },
      third:  { name: 'Darius Smith',  title: 'Hello?',  instagram: 'hashharborproductions' },
    },
  },

  // Add future cycles below this line:

];
