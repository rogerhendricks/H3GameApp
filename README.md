# H3 Game App

The H3 Game App is a mobile application built with React Native designed to assist soccer coaches with team management on game day. It provides tools to streamline pre-game setup, in-game tactical decisions, and player substitutions.

## Features

### Team and Roster Management (Pre-Game)
-   **Player Profiles:** Create and manage player profiles, including their name, jersey number, and preferred positions.
-   **Game Day Roster:** Easily select which players are present for a game, creating an active roster for the match.
-   **Local Database:** The app uses a local database, ensuring it works flawlessly on the field without an internet connection.

### Tactics Board (Visualizer)
-   **Formation Setup:** Choose from standard soccer formations (e.g., 4-4-2, 4-3-3) to visualize your team's setup.
-   **Drag-and-Drop Interface:** Drag and drop player nodes onto a visual representation of a soccer field to assign them to positions.
-   **Visual Player Nodes:** Player nodes display the player's jersey number and name for easy identification.

### Substitution Matrix (Live Game Management)
-   **Live Substitution Grid:** A clear grid view shows active players on the field and benched players for each time block of the game.
-   **Game Clock:** A persistent timer helps you track game progress and notifies you when it's time for planned substitutions.
-   **Color-Coded Status:** The grid uses colors to provide a quick "heat map" of who is on the field (Green) and who is on the bench (Gray), helping you manage playing time effectively.
-   **Smart Substitution Suggestions:** An algorithm can suggest optimal substitutions based on which players have been on the bench the longest and their preferred positions.
-   **Quick-Tap Event Tracking:** Easily log key game events like goals, shots on target, corners, and cards.

### Post-Game Analysis
-   **Fair Play Reports:** After the game, generate a summary report showing the total minutes played by each player. This is perfect for ensuring fair playing time and can be shared with players and parents.

## Tech Stack
-   **Framework:** React Native
-   **Database:** Local persistence for offline-first functionality.
-   **UI & Animations:** Styled components with `react-native-reanimated` for smooth animations.
-   **Icons:** `react-native-vector-icons` for a clean and consistent look.
