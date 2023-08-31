---
layout: post
title: Setting up bar-lobby
parent: Development
permalink: development/set_up
---

This will eventually be the step-by-step guide in written form, modified from the source video made by Jazcash.

If you prefer video to text, you can watch the original [guide from Jazcash].

---

## Windows 10 Guide: ##

Assumptions: This guide starts from a fresh installation of Windows 10 and assumes no prior installed software.

Installations:
 - [Download and install NodeJS v14], being sure to select the correct version for your operating system. Newer versions of NodeJS are not currently compatible with BAR Lobby Development. 
 - [Download and install Visual Studio Code]. VS Code is highly recommended due to all the extensions which make this process much easier. If you are already proficient in your preferred IDE, feel free to use that instead.
 - [Download and install Git], making sure to select your preferred IDE when prompted to choose a default editor (This guide assumes you selected VS Code).

 Cloning the repository:
 - Open VS Code:
    - Navigate to the Terminal tab, select New Terminal.
    - Ensure your new terminal is a bash terminal. If the right-hand side is showing a PowerShell terminal, be sure to click the down arrow next to the lower right hand "new terminal" button and select the Bash option.
    - Enter the command `git clone https://github.com/beyond-all-reason/bar-lobby.git`.

 Setting up your IDE:
 - After the download is complete, find the folder and open it with VS Code.- The first time you open this with VS Code, it should prompt you to install the following extensions:
    - ESLint & eslint-disable-snippets- Prettier Code Formatter
    - SCSS IntelliSense
    - Vue Language Features (Volar)
        - These are not required, but are strongly recommended.
 
 Installing and running the client as a developer:
 - Next, open a new bash terminal the same as when initially cloning the repo. The terminal should show that you are within the bar-lobby directory on your machine.
 - Run the command `npm install`. Expect this to take about 5 -10 minutes. This step is somewhat error-prone, and if you run into an issue please let the developer team know via [the Discord].
 - Next run the command `npm run dev` which should launch the client, which will then complete the process of setting up the environment and downloading any additional required resources.

Congratulations, by this point you should have all the tools necessary to begin contributing to the Beyond All Reason client!

[guide from Jazcash]: https://youtu.be/bVcKYPvVE8Q
[Download and install NodeJS v14]: https://nodejs.org/download/release/v14.21.3/
[Download and install Visual Studio Code]: https://code.visualstudio.com/download
[Download and install Git]: https://git-scm.com/downloads
[the Discord]: https://discord.gg/beyond-all-reason