# RECOMP'D: Gym Ready

I want to build a mobile-first strength training and workout tracking app called RECOMP'D.



This is a rebuild of an existing working application. The goal is NOT to make a generic fitness app. I want a polished, minimal, premium-feeling strength training app designed primarily for use on a phone in the gym.



For this first build, focus on the application foundation, navigation, design system and Home screen. Do not attempt to implement every feature yet.



PRODUCT DIRECTION



RECOMP'D should feel:



- Modern

- Minimal

- Dark

- Athletic

- Premium

- Fast

- Easy to operate one-handed in the gym

- Information-dense without feeling cluttered



Avoid the appearance of a corporate dashboard.



Avoid excessive explanatory text.



Prefer visual hierarchy, icons, numbers, progress indicators and short labels over paragraphs.



The app should feel like a dedicated mobile fitness application rather than a website displayed on a phone.



TECHNOLOGY



Build this using:



- React

- TypeScript

- Tailwind CSS

- shadcn/ui where appropriate

- Lucide icons

- A component-based architecture



Structure the project so Supabase can be connected later for authentication and cloud data.



Do NOT connect a database yet.



For this first version, use realistic mock workout data so the UI can be properly demonstrated.



DESIGN SYSTEM



The primary experience is dark mode.



Use approximately:



Background:

#080B09



Primary surface:

#101612



Elevated surface:

#151D18



Borders:

#263129



Primary text:

#F3F7F4



Secondary/muted text:

#8D9A91



Primary accent:

#27F46C



Secondary green:

#12B94B



Do not flood the interface with green.



Green should primarily indicate:



- selected states

- progress

- successful/completed actions

- important numbers

- primary actions



Use subtle gradients and extremely restrained green glows.



Cards should have approximately 16–20px corner radii.



Buttons should generally have 10–14px corner radii.



Avoid excessive shadows.



Use thin borders to separate surfaces.



Typography should be bold and athletic for important information but highly readable.



The RECOMP'D wordmark should be strong and relatively compact.



MOBILE LAYOUT



Design for approximately 390px phone width first.



It must also adapt cleanly to larger phones and desktop browsers.



Set a sensible maximum content width on larger displays so it still resembles a mobile application.



Respect safe areas on modern iPhones and Android phones.



NAVIGATION



Create persistent bottom navigation with four destinations:



Home

Build

Workout

Progress



Use Lucide icons with a short text label underneath.



Active:

bright green.



Inactive:

muted grey-green.



Do not put the navigation inside a floating oversized container.



Keep it compact and easy to reach with a thumb.



Add a small settings/profile control in the upper-right where appropriate.



HOME SCREEN



The Home screen should immediately answer:



1. What should I do next?

2. How much have I trained this week?

3. What have I done recently?



Do NOT make the Home screen excessively long.



Header



At the top:



RECOMP'D branding.



Small settings icon on the right.



Then:



"Hey, [Name]"



Keep this compact rather than making it a huge hero section.



Primary action



Create a visually prominent but clean workout card.



Its primary action should be:



START WORKOUT



Also provide a secondary path to:



PLAN WORKOUT



The Start Workout action should be the most visually obvious action on the screen.



Do not add descriptive copy such as "Generate a personalised workout based on your goals."



The labels should explain themselves.



THIS WEEK



Create a polished weekly training card.



Show:



- circular progress indicator for workouts completed versus target

- Monday through Sunday indicators

- completed training days

- scheduled training days

- workouts completed

- total sets

- training time



Example mock data:



3 / 4 workouts

42 sets

2h 38m



Keep this visual and compact.



TRAINING PRIORITY



Create a compact section showing which muscle groups currently need attention.



Example:



Chest — High

Back — Medium

Quads — Low



Use restrained progress indicators rather than lots of explanatory text.



This will eventually be calculated from workout history.



RECENT



Show the most recent workout.



Example:



Upper Body

Yesterday

52 min

18 sets



Provide a subtle chevron to view the workout.



Do not show unnecessary detail on the Home screen.



BODYWEIGHT



Add a small bodyweight summary.



Example:



101.2 kg

-0.8 kg over 30 days



This should be secondary information rather than dominating the Home screen.



BUILD SCREEN



For this first version, create the basic shell only.



It should eventually support two primary methods:



GENERATE

BUILD YOUR OWN



Use a segmented control or similarly compact selection mechanism.



Create placeholder sections for:



- muscle selection

- exercise selection

- number of exercises

- generated workout preview



Do not implement the workout generation algorithm yet.



WORKOUT SCREEN



Create an empty state when no workout is active.



Keep it extremely simple.



Show:



No active workout



and one prominent:



+ START WORKOUT



Do not fill the empty state with explanatory text.



We will build the full active workout experience separately.



PROGRESS SCREEN



Create the visual structure for:



Training Priority

Calendar

Personal Records

Bodyweight

Workout History



Do not fully implement analytics yet.



Use realistic mock data so the design can be evaluated.



COMPONENT ARCHITECTURE



Do not create one enormous component.



Create reusable components such as:



AppShell

BottomNavigation

Header

Card

ProgressRing

WeekTracker

TrainingPriority

WorkoutSummary

BodyweightSummary

WorkoutBuilder

ExerciseCard

EmptyWorkout

ProgressOverview



Keep business logic separate from visual components where practical.



The architecture needs to support a much larger application later.



UX RULES



Large tap targets.



No tiny important controls.



No horizontal page scrolling.



Inputs must work properly on mobile.



Avoid unnecessary confirmation dialogs.



Important destructive actions will eventually require confirmation.



Prefer bottom sheets/modals over browser alert dialogs.



Use subtle transitions for:



- tab changes

- cards

- progress

- selected states



Do not use excessive animation.



IMPORTANT



This is only Phase 1.



Do NOT currently build:



- authentication

- Supabase

- subscriptions

- payment systems

- exercise animations

- advanced workout generation

- rest timer

- supersets

- workout sharing

- social features



However, structure the application so those features can be added cleanly later.



The most important outcome of this phase is that the app has an excellent visual foundation and navigation architecture.



Make the application functional enough that I can navigate through Home, Build, Workout and Progress and evaluate the overall user experience.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/465a9460-5ace-5d8a-90ae-2e52ab14dc35).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
