#!/usr/bin/env node

'use strict';

var version = require('./lib/version.json');
var path = require('path');

var del = require('del');
var gulp = require('gulp');
var browserify = require('browserify');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var plumber = require('gulp-plumber');
var notify  = require('gulp-notify');
var source = require('vinyl-source-stream');
var exorcist = require('exorcist');
var streamify = require('gulp-streamify');
var replace = require('gulp-replace');
var babelify     = require('babelify');
var buffer       = require('vinyl-buffer');
var jsdoc = require("gulp-jsdoc3");
var pkg = require("./package.json");

var DEST = path.join(__dirname, 'dist/');
var dst = 'neb';
var lightDst = 'neb-light';
var requestDst = 'request';
var accountDst = 'account';
var transactionDst = 'transaction';
var nebulasDst = 'nebulas';
var nvmDst = 'nvm';
var documentationDst =  path.join(__dirname, 'docs/');

// Error / Success Handling
var onError = function(err) {
    notify.onError({
        title: "Error: " + err.plugin,
        subtitle: "<%= file.relative %>",
        message: "<%= error.message %>",
        sound: "Beep",
    })(err);
    console.log(err.toString())
    this.emit('end');
}

function onSuccess(msg) {
    return {
        message: msg + " Complete! ",
        onLast: true
    }
}

function notifyFunc(msg) {
    return gulp.src('.', { read: false })
        .pipe(notify(onSuccess(msg)))
}

var browserifyOptions = {
    debug: true,
    insert_global_vars: false, // jshint ignore:line
    detectGlobals: false,
    bundleExternal: true
};

gulp.task('version', function(){
  gulp.src(['./package.json'])
    .pipe(replace(/\"version\"\: \"([\.0-9]*)\"/, '"version": "'+ version.version + '"'))
    .pipe(gulp.dest('./'));
});

gulp.task('lint', [], function(){
    return gulp.src(['./index.js', './lib/*.js', './lib/**/*.js','!./lib/nvm/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('clean', ['lint'], function(cb) {
    del([ DEST ]).then(cb.bind(null, null));
});

gulp.task('light', ['clean'], function () {
    return browserify(browserifyOptions)
        .require('./lib/neb.js', {expose: 'neb'})
        .ignore('bignumber.js')
        .require('./lib/utils/browser-bignumber.js', {expose: 'bignumber.js'}) // fake bignumber.js
        .transform(babelify)
        .bundle()
        .pipe(exorcist(path.join( DEST, lightDst + '.js.map')))
        .pipe(source(lightDst + '.js'))
        .pipe(gulp.dest( DEST ))
        .pipe(streamify(uglify()))
        .pipe(rename(lightDst + '.min.js'))
        .pipe(gulp.dest( DEST ));
});

gulp.task('neb', ['clean'], function () {
    return browserify(browserifyOptions)
        .require('./lib/neb.js', {expose: 'neb'})
        .transform(babelify)
        .bundle()
        .pipe(exorcist(path.join( DEST, dst + '.js.map')))
        .pipe(source(dst + '.js'))
        .pipe(gulp.dest( DEST ))
        .pipe(streamify(uglify()))
        .pipe(rename(dst + '.min.js'))
        .pipe(gulp.dest( DEST ));
});

gulp.task('request', ['clean'], function () {
    return browserify()
        .require('./lib/httprequest.js', {expose: 'httprequest'})
        .transform(babelify)
        .bundle()
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(exorcist(path.join( DEST, requestDst + '.js.map')))
        .pipe(source('account.js'))
        .pipe(buffer())
        .pipe(rename(requestDst + '.js'))
        .pipe(gulp.dest(DEST));
});

gulp.task('account', ['clean'], function () {
    return browserify()
        .require('./lib/account.js', {expose: 'account'})
        .transform(babelify)
        .bundle()
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(exorcist(path.join( DEST, accountDst + '.js.map')))
        .pipe(source('account.js'))
        .pipe(buffer())
        .pipe(rename(accountDst + '.js'))
        .pipe(gulp.dest(DEST));
});

gulp.task('transaction', ['clean'], function () {
    return browserify()
        .require('./lib/transaction.js', {expose: 'transaction'})
        .transform(babelify)
        .bundle()
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(exorcist(path.join( DEST, transactionDst + '.js.map')))
        .pipe(source('transaction.js'))
        .pipe(buffer())
        .pipe(rename(transactionDst + '.js'))
        .pipe(gulp.dest(DEST));
});

gulp.task('nvm', ['clean'], function () {
    return browserify()
        .require('./lib/nvm/nvm.js', {expose: 'nvm'})
        .ignore('node-localstorage.js')
        .require('./lib/nvm/native/browser-localstorage.js', {expose: 'node-localstorage.js'}) // fake node-localstorage.js
        .transform(babelify)
        .bundle()
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(exorcist(path.join( DEST, nvmDst + '.js.map')))
        .pipe(source('nvm.js'))
        .pipe(buffer())
        .pipe(rename(nvmDst + '.js'))
        .pipe(gulp.dest(DEST));
});

gulp.task('nebulas', ['clean'], function () {
    return browserify()
        .require('./index.js', {expose: 'nebulas'})
        .ignore('node-localstorage.js')
        .require('./lib/nvm/native/browser-localstorage.js', {expose: 'node-localstorage.js'}) // fake node-localstorage.js
        .transform(babelify)
        .bundle()
        .pipe(plumber({ errorHandler: onError }))
        // .pipe(exorcist(path.join( DEST, nebulasDst + '.js.map')))
        .pipe(source('nebulas.js'))
        .pipe(buffer())
        .pipe(rename(nebulasDst + '.js'))
        .pipe(gulp.dest(DEST));
});

gulp.task('watch', function() {
    gulp.watch(['./lib/*.js'], ['lint', 'build']);
});

gulp.task('documentation', function(cb) {

    gulp.src(['README.md', './lib/*.js', './lib/**/*.js'])
        .pipe(jsdoc({
            opts: {
                destination: documentationDst,
                "template": "./docs-data/template"
            },
            templates: {
                "systemName"            : pkg.description,
                "logoFile"              : "img/logo.png",
                "copyright"             :  pkg.copyright,
                "theme"                 : "lumen",
                "linenums"              : true,
                "sort"				    : false,
            }
        }, cb))
});

gulp.task('default', ['version', 'lint', 'clean', 'light', 'neb', 'request', 'account', 'transaction', 'nebulas', 'nvm', 'documentation']);

