# Development

This folder is used to enable better development for the FSXA API.

The `index.ts` file imports the FSXA-API from the `src` folder and makes all functions available so that you can test them directly during development.

There you can these functions and see if the FSXA-API behaves as desired during development.

## Getting Started

Copy the `.env.template` file, rename it to `.env` and write there all needed variables.
Make sure that the `.env` file is located in the `dev` folder.

These will be loaded during execution.

To install all needed dependencies run `npm install` before you start the service.

To start the test environment, you can enter the `npm run dev` in the terminal.
This command is started via [nodemon](https://www.npmjs.com/package/nodemon), so a hot-reload is included.
