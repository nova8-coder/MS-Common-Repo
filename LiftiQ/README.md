# LiftIQ 3.0 prototype application

The consolidated, runnable application is in [`app/`](app/). The original standalone HTML prototypes remain alongside it as reference material.

## Run locally

```sh
cd LiftiQ/app
npm install
npm run dev
```

Create a production build with `npm run build` and preview it with `npm run preview`.

## Structure

- `src/data/` contains typed illustrative station, pump, alarm, notification, and preference data.
- `src/logic/alarmLifecycle.ts` contains lifecycle event handling and manual evidence completion rules.
- `src/components/` contains shared UI components and tokens.
- `src/pages/` contains the dashboard, station, alarm, and notification views.

All interactions are local to this prototype. It has no backend, does not send notifications, and does not control real devices. Mock values are identified in the UI where the source material is incomplete.
