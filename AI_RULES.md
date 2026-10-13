# AI Rules

## Tech stack

- Use **React 19** with **TypeScript** for all application code.
- Use **TanStack Start** and **Vite** for the full-stack application runtime and development/build tooling.
- Use **TanStack Router** for routing; keep route definitions in `src/routes/` and preserve the generated `src/routeTree.gen.ts` conventions.
- Use **Tailwind CSS v4** with `tw-animate-css` for styling, spacing, responsive layouts, and design tokens.
- Use the existing **shadcn/ui** components in `src/components/ui/`, built on **Radix UI**, for accessible interface primitives.
- Use **Lucide React** for interface icons instead of manually drawn SVG icon components.
- Use **React Hook Form** with **Zod** and `@hookform/resolvers` for form state and validation.
- Use **TanStack Query** for asynchronous server state and request caching when remote data is introduced.
- Use **Vitest**, Testing Library, and JSDOM for unit and component tests.

## Library and implementation rules

- Prefer existing components from `src/components/ui/` before creating a new primitive. Do not edit generated or shared shadcn/ui files unless a change is required globally; compose them in feature components instead.
- Use Tailwind utility classes for component styling. Keep reusable color, typography, and spacing values in the existing design tokens rather than scattering hard-coded styles.
- Use `cn` from `src/lib/utils.ts` to merge conditional Tailwind classes. Do not add another class-name utility.
- Use TanStack Router for navigation and route data. Do not introduce React Router or a second routing system.
- Keep route files under `src/routes/`, reusable UI under `src/components/`, feature logic in focused modules, and shared pure logic under `src/lib/`.
- Use `offer-sign.ts` as the shared source of truth for sign dimensions, price parsing, and offer-sign data used by both preview and export flows.
- Render offer artwork through the shared offer-sign component for previews and PNG export so visual output remains consistent.
- Keep color mode state independent from the sign model so palette changes preserve edited product details.
- Keep the offer editor client-side and session-scoped; do not add accounts, persistence, or a backend collection unless explicitly requested.
- Validate user-entered values at form boundaries with Zod, and avoid unsafe HTML injection or unsanitized dynamic markup.
- Write tests for shared business logic and important editor interactions. Run the existing test and type-check workflows after meaningful changes.
- Prefer small, focused components and simple data flow. Do not add a dependency when an existing package or a native React/TypeScript solution is sufficient.
