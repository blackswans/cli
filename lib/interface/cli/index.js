#!/usr/bin/env node

const path = require('path');
const _ = require('lodash');
const yargs = require('yargs');
const recursive = require('recursive-readdir');
const CFError = require('cf-errors');
const DEFAULTS = require('./defaults');
const authManager = require('../../logic').auth.manager;
const { printError } = require('./helpers/general');

process.on('uncaughtException', function (err) {
    console.error('uncaughtException', err.stack);
});

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.error('unhandledRejection', error.stack);
});


recursive(path.resolve(__dirname, 'commands'), (err, files) => {
    const rootCommands = [];

    _.forEach(files, (file) => {
        if (file.endsWith('.cmd.js')) {
            const command = require(file);
            if (command.isRoot()) {
                rootCommands.push(command);
            }
        }
    });

    yargs
        .env('')
        .options('cfconfig', {
            default: DEFAULTS.CFCONFIG,
            global: false,
        })
        .option('version', {
            alias: 'v',
            global: false,
        })
        .config('cfconfig', 'Custom path for authentication contexts config file', (configFilePath) => {
            try {
                authManager.loadContexts(configFilePath, process.env.CF_TOKEN, process.env.CF_URL || DEFAULTS.URL);
            } catch (err) {
                printError(err);
                process.exit(1);
            }
        });

    _.forEach(rootCommands, (command) => {
        yargs.command(command.toCommand());
    });


    yargs // eslint-disable-line
        .completion()
        .demandCommand(1, 'You need at least one command before moving on')
        .wrap(null)
        .help('help')
        .option('help', {
            global: false,
        })
        .argv;
});