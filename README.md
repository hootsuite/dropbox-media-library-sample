# Dropbox Media Library Sample App

> Predefined API Sample app for external developers to install

## Table of Contents

- [Overview](#overview)
  - [What does this Hootsuite app do?](#what-does-this-hootsuite-app-do)
- [Getting started](#getting-started)
  - [Using Heroku](#using-heroku)
  - [Using another solution](#using-another-solution)
- [Configuration](#configuration)
  - [Configuring your Hootsuite App](#configuring-your-hootsuite-app)
  - [Configuring your shared secret](#configuring-your-shared-secret-for-use-with-attachfiletomessage)
  - [Providing Media for the Sample App to use](#providing-media-for-the-sample-app-to-use)
  - [Configuring your OAuth 2 Dev Access Token](#configuring-your-oauth-2-dev-access-token)
- [Testing your Media Library App with Runscope](#testing-your-media-library-app-with-runscope)
  - [Setting up Runscope](#setting-up-runscope)
  - [Customizing the Tests](#customizing-the-tests)
- [Useful Links](#useful-links)

## Overview

### What does this Hootsuite app do?

This sample app contains a [Media Library](http://app-directory.s3.amazonaws.com/docs/outbound-api/index.html) app. The Media Library enables users with the new compose functionality to pull in images from external sources to use in their social media posts. Media Library apps integrate external media sources into the Media Library, usually using the APIs of cloud services to retrieve a user's media. This app integrates the Media Library with Dropbox using Dropbox's HRA(HTTP(Hypertext Transfer Protocol) REST(Representational State Transfer) API(Application Program Interface)).

The Sample App can be hosted locally, or on Heroku or some other hosting service. The backend is a NodeJS/Express app.

## Getting started

### Using Heroku

1. [Setup Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up).
2. Clone this repository.
3. [Create a Heroku app](https://devcenter.heroku.com/articles/getting-started-with-nodejs#deploy-the-app) for this sample app.
4. `git push heroku master` to push this app to Heroku. Heroku should detect that this app is a Node/Express app and run your index.js file
5. Once Heroku says that it's done use `heroku open` and add `/v1/status` to the URL it opened in your browser. If you get a blank page that says `OK` then you've configured Heroku correctly.

## Configuration

### Configuring your Hootsuite App

1. If you already have a Hootsuite developer account head over to [your Hootsuite app  directory management page](https://hootsuite.com/developers/my-apps) and create an app, and inside that app create a media library component. 
2. Edit the media component and enter the following into the fields: For the media component Service URL use your endpoint's root Heroku domain. `https://<heroku-app-name-here>.herokuapp.com`.
3. Create a Dropbox app in [Dropbox's My apps](https://www.dropbox.com/developers/apps). Choose the `Dropbox API`, `App folder` access, and give it a name.
4. Edit your Hootsuite app in [Hootsuite's My Apps](https://hootsuite.com/developers/my-apps). Fill in the field's as following. Left is Dropbox and right is Hootsuite
  * App key -> Client ID
  * App secret -> Client secret
  * `https://api.dropboxapi.com/oauth2/token` -> Token URL
  * `https://www.dropbox.com/oauth2/authorize` -> Authorization URL	
5. Hit Save and copy the redirect URI in Hootsuite to Dropbox's redirect URI section.
6. Install your app by going to your [Hootsuite dashboard](https://hootsuite.com/dashboard) and opening up the Composer (Beta) at the top right. Open the Media Library by pressing the button near the upload area and install your app in the dropdown where `Free Images` is the current selection.
7. Log into your Dropbox account in the popup (You may need to enable popups on that page).
8. Next you will need to provide some media for the Media Library to display.

### Providing Media for the Sample App to use

1. Open your Dropbox that you used to login in the Media Library.
2. There should be a folder called Apps and inside that a folder with the name of the Dropbox App you created. Place all of your media that you want the app to display in that folder. For pictures, JPG format should be used. Videos and GIFs are currently not supported.
3. You will have to wait for Dropbox to add media_info to the file before it appears in the Hoostsuite content library, this can take some time.

### Configuring your OAuth 2 Dev Access Token

Note: These steps should only be used for an app in development as your dev token will override the app's auth and use the account of the developer who generates the token.
1. Create a Dropbox app in [Dropbox's My apps](https://www.dropbox.com/developers/apps). Choose the `Dropbox API`, `App folder` access, and give it a name.
2. Generate a Dropbox `Generated access token` and save it.
3. Set it as the environment variable `DROPBOX_ACCESS_TOKEN`. In order to do this on Heroku use the command `heroku config:set DROPBOX_ACCESS_TOKEN=<access token here>`

## Testing your Media Library App with Runscope

Before you can release a Media Library app for use with the Hootsuite platform, your app must pass a set of tests verifying
that it satisfies our API requirements. You can run these tests yourself using Runscope and the `MediaLibraryAppVerificationTest.json`
file included in this repo.

Read below for instructions on setting up the tests to work with Runscope.

### Setting up Runscope

In order to use Runscope to run these API tests, you will need a Runscope account. If you don't already have one, sign up
for an account [here](https://www.runscope.com). After you have an account, follow the steps below to add the tests to your
account.

1. Download `MediaLibraryAppVerificationTest.json` from this repo.
2. Login to Runscope and select the `Tests` tab in the top-left.
3. Click `Import Test` in the bottom left.
4. You will be taking to a page titled `Import Tests into Cheerful String`. On this page, select `Runscope API Tests`. Then,
add the `MediaLibraryAppVerificationTest.json` file that you downloaded previously.
5. Click `Import Tests`, and then go back to the `Tests` tab. You should see a new box labeled `Media Library App Verification
Test`.

Next, you will have to customize the test to work with your app.

### Customizing the Tests

After you've imported the test suite into Runscope, you will need to change the settings to work with your app. Here are instructions
for doing that:

1. Select the `Tests` tab in the upper-left, then hover over the `Media Library App Verification Test` that you just imported.
Click the `Edit` button that will appear in the lower-left corner of the box.
2. Under the `Environment` header, click the arrow next to `Test Settings` to expand it. The `Initial Variables` tab should
already be selected.
3. Click `Add Initial Variable`. We will be adding four variables to the tests. All variable names are case sensitive.
4. The first variable is named `baseURL`. For the value, enter the URL that your app has exposed for API calls.
5. The second variable is named `supportedMediaTypes`. For the value, copy and paste in this array: `['Image', 'AnimatedGif', 'Video', Folder']`.
Then, delete the variables that your app does not support from that array. For example, if your app only searches for images
and gifs, you would delete `'Video'` and `'Folder'` from the array, so that the value reads `['Image', 'AnimatedGif']`. This step
will prevent the test suite from running tests on functionality that you don't support.
6. The third variable is named `authToken`. For the value, enter a valid access token for your app. If your app does not 
support authentication, just enter a dummy value for this variable. (You need some value for this variable, even if your 
app does not support authentication, or otherwise the tests will break.)
7. The final variable is named `nextCursor`. It should always be set to `defaultCursorValue`. (The tests will automatically
change this variable as they run, but you don't need to do anything yourself.)
8. At this point, the tests are fully configured. Click `Save & Run` near the top of the page in order to run the tests
against your app!

## Webhooks

You can configure your app to receive webhooks so you can be notified about events, such as when a Hootsuite user [installs or uninstalls your app](https://developer.hootsuite.com/docs/webhooks#section-apps).

Go to [My Apps](https://hootsuite.com/developers/my-apps) to configure your webhooks URL.  For example, using this sample app deployed to Heroku, your webhooks URL would be https://<heroku-app-name-here>.herokuapp.com/webhooks.

## Useful Links

* [Hootsuite Developer Docs](https://developer.hootsuite.com/docs)
* [Dropbox Developer Docs](https://www.dropbox.com/developers)
