# Build a messaging app with Polymer 2.0

##### **Note**
---
The content of this repository is an example of what you could build following this tutorial.
You **do not** need to pull the content of this repository to complete the tutorial.

### Tools required
- NodeJS 6.x.x

### Setup your environment
Before starting building our project, we will need to install a few dependencies.
```sh
npm install -g bower polymer-cli
```

Now, let's make a new folder for our project, and navigate to it.
```sh
mkdir polychat
cd polychat
```

We will now have to initialize our Polymer project using the Polymer CLI (Command Line Interface).
```sh
polymer init
```

At this stage, Polymer will ask you if you want to create a new Polymer element, a new Polymer application, use their starter-kit, or test their "Shop" Progressive Web App demo.

In our case, we want to create a **new application**.

Follow the next steps, no big deal there. I called my app **polychat**, and my main component **pc-app**.

Your Polymer project should be initialized. Let's serve our new project and navigate to our local test URL to test if everything is okay.
```sh
polymer serve
```

Now, let's start coding!

### Build the app

If we look at our project folder, we can see that the main component for our app has been created in `/src/pc-app/pc-app.html`. Let's open it!

After looking at our component, we can see that it is initialized using the `<dom-module>` tag, and is wrapped in a `<template>` tag. Polymer is imported using a `<link rel="import">` tag.

We can also see 3 sections in our code, the **CSS**, the **HTML**, and **Javascript**.
I will get rid of the placeholder data in the HTML and Javascript first before writing anything by simply removing the `<h2>` tag and the `prop1` property in my `properties` getter.

##### GET and POST messages

Our backend developer gave us an endpoint that we can use to **GET** and **POST** our messages: https://polychat-4cf47.firebaseio.com/messages.json

We will import our first Polymer element `<iron-ajax>` to take care of our ajax calls to the API. To install a webcomponent is pretty simple, in your Polymer folder enter the command `bower install --save iron-ajax`. Once that's done, you just have to import your component using `<link rel="import" href="../../bower_components/iron-ajax/iron-ajax.html">`. You can find the webcomponents and their documentations on https://www.webcomponents.org.

Now, let's use [iron-ajax](https://www.webcomponents.org/element/PolymerElements/iron-ajax) to get our messages:

```html
<iron-ajax
    id="getter"
    url="https://polychat-4cf47.firebaseio.com/messages.json"
    method="GET"
    handle-as="json"
    on-response="_setMessages"
    on-error="_getMessages"
    params="[[params]]"></iron-ajax>
```

The `id`, `url`, and `method` attribute are self-explanatory. `handle-as="json"` will handle the response as a JSON string. `on-response` and `on-error` are events that points to functions written in my component's class. And `params` is a object that I have to declare in my component's `properties` getter:

```js
static get properties() {
    return {
        ...
        messages: {
            type: Array,
            value: () => []
        },
        params: {
            type: Object,
            value: {
                // API query options
                limitToLast: 50, // will return the last 50 messages posted
                orderBy: "\"$key\"" // the messages are ordered based on the value of their key
            }
        },
        ...
    }
}
```

I will now have to write the functions responsible for handling my `response` and `error` events.

```js
class PcApp extends Polymer.Element {
    ...
    _setMessages(e) { // Triggered on response
        // response is supposed to contain my messages object but could be null
        let response = e.detail.response;
        if(response){
            // Since my query uses "startAt" based on the key of the last message I received,
            // this message will be the first message of the next batch of messages I get from the API,
            // so I delete it to avoid duplicates.
            delete response[this._getLastKey()];
            // Let's convert my object of messages into an array.
            let messages = [];
            Object.keys(response).map(key => {
                response[key].key = key;
                messages.push(response[key]);
            })
            // I append my new array of messages to the existing one
            this.messages = this.messages.concat(messages);
            // I save the last 50 messages in the local storage for optimization purposes
            if(window.localStorage) window.localStorage.setItem('messages', JSON.stringify(this.messages.slice(-50)));
            // I set "startAt" to the key of the last message received
            this.params.startAt = `\"${this._getLastKey()}\"`;
        }
        // Send a new request to the getter
        this._getMessages();
    }
    
    _getMessages() { // Triggered on error
        // Clears timeout in case of double call
        clearTimeout(this.timeout);
        // Sends a request to get messages after 500ms
        this.timeout = setTimeout(_ => this.$.getter.generateRequest(), 500);
    }
    
    _getLastKey() {
        // returns the key of the last message received
        return this.messages.length ? this.messages[this.messages.length - 1].key : "";
    }
    ...
}
```

I should be able to get my messages fine now, but I still need to send my messages.
Let's create another `<iron-ajax>` element to handle our POST requests.

```html
<iron-ajax
    id="setter"
    url="https://polychat-4cf47.firebaseio.com/messages.json"
    method="POST"
    handle-as="json"
    content-type="application/json"></iron-ajax>
```

I can use this element to send my message in just a few lines of Javascript! This function can be bound to a button or the keydown event if enter is pressed.

```js
_sendMessage(e) {
    // Return if my message is empty
    // this.$messager points to my input element
    if(!this.$messager.value.replace(/(\t|\n|\r| )/g, '').length) return;
    // Targets my setter based on its ID and sends the request
    this.$.setter.body = {
        message: this.$messager.value,
        timestamp: Date.now()
    }
    this.$.setter.generateRequest();
    this.$messager.value = "";
}
```

Now, we only have to display the messages! We can use the `dom-repeat` template to loop through our array of messages.

```html
<template is="dom-repeat" items="[[messages]]" as="message">
    <pc-message message="[[message]]"></pc-message>
</template>
```

In the `items` attribute we pass our array of messages. `as` is the value of the current item processed by the loop.
As you can see I decided to create a new custom element to display each message. This way, I'll have less code in my app component and on the other hand every message will be treated separately.

Let's dive into this new component. First, I'll need to copy my boilerplate to create my new component:
```html
<link rel="import" href="../../bower_components/polymer/polymer-element.html">

<dom-module id="pc-message">
    <template>
        <style></style>
        <div id="content"></div>
    </template>
    <script>
        class PcMessage extends Polymer.Element {
            static get is() { return 'pc-message'; }
            static get properties() {
                return {}
            }
        }
        window.customElements.define(PcMessage.is, PcMessage);
    </script>
</dom-module>
```

I'll add my `message` property, and bind an observer. This observer will trigger of functions everytime the value of `message` is changed. It'll pass the new value and the old value as parameters.

```js
...
message: {
    type: Object,
    observer: '_contentChanged'
},
...
```

Then I'm gonna write the function my observer is pointing to, it's going to process my message and write it in the DOM.

```js
...
_contentChanged(message){
    // Sets the content of <div id="content"> with the content of my message + links
    this.$.content.innerHTML = this._generateLinks(message.message);
}

_generateLinks(text) {
    // Transforms URLs into HTML links
    return text.replace(/(\b((https?|ftp|file):\/\/|(www))[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]*)/ig,
                        "<a href='$1' target='_blank'>$1</a>");
}
...
```

Let's not forget to import our new element into our app!
```html
<link rel="import" href="pc-message.html">
```

### Congratulations! You have created your first Polymer app!
Feel free to add more features to your code like a simple login for your users.
Once your app ready, you can build it using the `polymer build` command. More info about how to configure the build process: https://www.polymer-project.org/2.0/docs/tools/polymer-json.
Here is a basic polymer.json file:

```json
{
  "lint": {
    "rules": [
      "polymer-2"
    ]
  },
  "entrypoint": "index.html",
  "shell": "src/pc-app/pc-app.html",
  "sources": [
    "bower.json",
    "src/pc-app/*"
  ],
  "extraDependencies": [
    "manifest.json"
  ],
  "builds": [
    {
      "addServiceWorker": true,
      "html": {
        "minify": true
      },
      "css": {
        "minify": true
      },
      "js": {
        "minify": true,
        "compile": true
      },
      "bundle": true
    }
  ]
}
```

You'll also need to configure your service worker using the `sw-precache-config.js` file. More info about this here: https://github.com/GoogleChrome/sw-precache.
Here is a very basic configuration:

```js
module.exports = {
    staticFileGlobs: [
        '/index.html',
        '/manifest.json',
        '/bower_components/webcomponentsjs/*',
        '/src/**/*'
    ],
    navigateFallback: 'index.html',
    navigateFallbackWhitelist: [/^(?!.*\.html$|\/data\/.*)/]
}
```

You should now be able to build your PWA-ready Polymer project!

## Thank you all!

##### [@BPS_Julien](https://twitter.com/BPS_Julien)