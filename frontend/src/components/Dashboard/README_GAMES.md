Games module overview

- Adds a 2048 game to the Dashboard -> Games tab.
- Controls: Arrow keys or WASD on desktop; swipe on mobile.
- Submit score requires auth token; leaderboard shows top 20.
- Backend endpoints:
  - POST /games/score { game: '2048', score }
  - GET /games/top/2048
  - GET /games/best/2048 (auth)

Notes
- This is a minimal implementation meant to be extended with more games, tournaments, badges, and real-time rooms.
