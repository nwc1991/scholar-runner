#!/usr/bin/env node

var program = require('commander');
var path = require('path');
var pick = require('lodash.pick');
var merge = require('lodash.merge');
var packageJson = require('./package.json');
var buildDirectories = require('./helpers/directories');
var pipeHelper = require('./helpers/stdin');
var testHelper = require('./helpers/fetchTests');

program
    .version(packageJson.version)
    .option('-b, --browser <option>', 'Define test browser (defaults to "phantomjs")', 'phantomjs')
    .option('-r, --runner <option>', 'Define the runner for the tests e.g. local, remote (defaults to "local")', 'local')
    .option('--seleniumVersion <version>', 'Optionally use a specific selenium version', '2.53.0')
    .option('--verbose', 'Define selenium log level')
    .option('-s, --suite <suite>', 'Define file to run (optional)')
    .option('-t, --type <key>', 'Define subset of tests to run (optional)', 'all')
    .option('-c, --config <filePath>', 'Define config file location (defaults to "config/scholar.js")', 'config/scholar.js')
    .option('-d, --directory <testDirectory>', 'Define test files directory (defaults to "process.cwd()/test/")', 'test')
    .option('-o, --output <imageDirectory>', 'Define directory to place screenshots (defaults to "process.cwd()/test_images/")', 'test_images')
    .parse(process.argv);

var appConfig = require(path.join(process.cwd(), program.config));
var options;

buildDirectories(program, ['output']);
pipeHelper(mergeData);

function mergeData(parsedData) {
    merge(appConfig, parsedData);
    options = pick(program, ['browser', 'runner', 'verbose', 'seleniumVersion', 'output']);
    testHelper(program.directory, program.suite, program.type, generateSpecs);
}

function generateSpecs(testResults) {
    options.scenarios = testResults;
    if (program.browser === 'phantom') options.browser = 'phantomjs';
    require('./lib/runner')(appConfig, options)
}
