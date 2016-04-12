'use strict';

module.exports = function (options) {

    var selenium = require('selenium-standalone');
    var webdriverio = require('webdriverio');
    var path = require('path');
    var $ = require('async');
    var fs = require('fs');
    var jimp = require('jimp');

    var config = require(path.join(process.cwd(), options.config));

    var wdOptions = {
        "logLevel": options.verbose ? "verbose" : "silent",
        "desiredCapabilities": {
            browserName: options.browser
        },
        "phantomjs.binary.path": 'node_modules/.bin/phantomjs'
    };

    var conf = {
        version: '2.53.0',
        baseURL: 'https://selenium-release.storage.googleapis.com',
        logger: message => {
            if (options.verbose) {
                console.log(message)
            }
        }
    };

    selenium.install(conf, err => {

        if (err) {
            console.error(`Selenium installation Error! ${err}`);
            throw err;
        }

        selenium.start({}, function (err, childProcess) {

            if (err) {
                console.error(`Selenium start Error! ${err}`);
                throw err;
            }

            var client = webdriverio.remote(wdOptions).init();

            var scenarioFns = options.scenarios.map(scenario => callback => {
                console.log(`Running ${scenario.name}`);

                const uri = (scenario.url || config.baseUrl) + scenario.path;
                const setupFunction = scenario.setup || function () {};
                const viewportSize = scenario.viewportSize || {width: 970, height: 727};

                const scrollToOffset = 62;
                var elementBox;

                client
                    .url(uri)
                    .setViewportSize(viewportSize)
                    .pause(scenario.loadTimeout || 2000)
                    .execute(setupFunction)
                    .pause(scenario.setupTimeout || 0)
                    .execute(function (selector) {
                        var element = document.querySelector(selector);
                        window.scrollTo(0, element.getBoundingClientRect().top - scrollToOffset);
                        return element.getBoundingClientRect()
                    }, scenario.selector)
                    .then(resp => elementBox = resp.value)
                    .saveScreenshot(path.join(process.cwd(), `test_out/images/${options.browser}-${scenario.name}.png`))
                    .then((pngImage) => {
                        jimp.read(pngImage, function (err, image) {

                            if (err) {
                                console.error('image error', err);
                                return callback(err);
                            }

                            const x = elementBox.left;
                            const y = elementBox.top;
                            const w = Math.min(elementBox.width, viewportSize.width);
                            const h = Math.min(elementBox.height, viewportSize.height);

                            image
                                .crop(x, y, w, h)
                                .write(path.join(process.cwd(), `test_out/images/${options.browser}-${scenario.name}.png`), callback);
                        });
                        callback();
                    })
                    .catch(err => {
                        console.error(err);
                        callback(err);
                    });
            });

            $.series(scenarioFns, (err, results) => {
                console.log('Finished Specs! Killing client');
                client
                    .end()
                    .then(() => {
                        childProcess.kill();
                        if (err) {
                            console.error('Test Execution Error: ', err);
                            throw err;
                        }
                        process.exit();
                    })
            });

        });


    });
};