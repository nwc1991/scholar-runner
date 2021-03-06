var dir = require('node-dir');
var path = require('path');
var fs = require('fs');
var $ = require('async');
var request = require('request');

module.exports = function (scholarUrl, imageResults, callback) {

    var imageComparisionFns = [];
    imageResults.forEach(function (image) {

        const labels = image.scenario.labels || [];

        imageComparisionFns.push(function (submissionCallback) {

            fs.readFile(image.filePath, function (err, data) {
                if (err) throw err;
                var fileData = data.toString('base64');

                request({
                    method: 'POST',
                    url: scholarUrl + '/api/screenshot/' + image.scenario.name,
                    headers: {
                        'X-Scholar-Meta-Browser': image.browser,
                        'X-Scholar-Meta-Resolution': image.resolution,
                        'X-Scholar-Meta-Labels': labels.join(', ')
                    },
                    form: {
                        imageData: fileData
                    }
                }, function (err, httpResponse, body) {
                    try {
                        var resp = JSON.parse(body);
                        resp.name = image.scenario.name;
                        return submissionCallback(err, resp);
                    } catch (e) {
                        console.error(`Error! ${e} occurred. Scholar response was: ${body}`);
                        submissionCallback(e);
                    }
                });
            });
        });
    });

    $.parallelLimit(imageComparisionFns, 10, function (err, results) {
        if (err) {
            console.error('Image Submit / Compare Errored!', err);
            throw err;
        }
        callback(err, results);
    });

};
