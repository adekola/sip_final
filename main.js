/* This is the MyApp constructor. */
function MyApp() {
    this.addressInput = document.getElementById('address-input');
    this.passwordInput = document.getElementById('password-input');
    this.identityForm = document.getElementById('identity-form');
    this.identityForm.addEventListener('submit', function (e) {
        e.preventDefault();
        this.requestCredentials();
    }.bind(this), false);

    this.userAgentDiv = document.getElementById('user-agent');
    this.remoteMedia = document.getElementById('remote-media');
    this.remoteMedia.volume = 0.5;

    this.destinationInput = document.getElementById('destination-input');
    this.inviteButton = document.getElementById('invite-button');
    this.inviteButton.addEventListener('click', this.sendInvite.bind(this), false);

    this.acceptButton = document.getElementById('accept-button');
    this.acceptButton.addEventListener('click', this.acceptSession.bind(this), false);

    this.terminateButton = document.getElementById('terminate-button');
    this.terminateButton.addEventListener('click', this.terminateSession.bind(this), false);

    document.addEventListener('keydown', function (e) {
        this.sendDTMF(String.fromCharCode(e.keyCode));
    }.bind(this), false);

    this.volumeRange = document.getElementById('volume-range');
    this.volumeRange.addEventListener('change', this.setVolume.bind(this), false);

    this.muteButton = document.getElementById('mute-button');
    this.muteButton.addEventListener('click', this.toggleMute.bind(this), false);
}

/* This is the MyApp prototype. */
MyApp.prototype = {

    requestCredentials: function () {
        var xhr = new XMLHttpRequest();
        xhr.onload = this.setCredentials.bind(this);
        xhr.open('get', 'https://api.onsip.com/api/?Action=UserRead&Output=json');

        var userPass = this.addressInput.value + ':' + this.passwordInput.value;
        xhr.setRequestHeader('Authorization',
            'Basic ' + btoa(userPass));
        xhr.send();
    },

    setCredentials: function (e) {
        var xhr = e.target;
        var user, credentials;

        if (xhr.status === 200) {
            user = JSON.parse(xhr.responseText).Response.Result.UserRead.User;
            credentials = {
                uri: this.addressInput.value,
                authorizationUser: user.AuthUsername,
                password: user.Password,
                displayName: user.Contact.Name
            };
        } else {
            alert('Authentication failed! Proceeding as anonymous.');
            credentials = {};
        }

        this.createUA(credentials);
    },

    createUA: function (credentials) {
        this.identityForm.style.display = 'none';
        this.userAgentDiv.style.display = 'block';
        this.ua = new SIP.UA(credentials);

        this.ua.on('invite', this.handleInvite.bind(this));
    },

    handleInvite: function (session) {
        if (this.session) {
            session.reject();
            return;
        }

        this.setSession(session);

        //here's where to prompt the user of an incoming call
        startRingTone();
        this.setStatus('Ring Ring! ' + session.remoteIdentity.uri.toString() + ' is calling!', true);
        this.acceptButton.disabled = false;
    },

    acceptSession: function () {
        if (!this.session) {
            return;
        }

        this.acceptButton.disabled = true;
        this.session.accept(this.remoteMedia);
        stopRingTone();
    },

    sendInvite: function () {
        var destination = this.destinationInput.value;
        if (!destination) {
            return;
        }

        var session = this.ua.invite(destination, this.remoteMedia);

        this.setSession(session);
        this.inviteButton.disabled = true; // TODO - use setStatus. Disable input, too?
        
    },

    setSession: function (session) {
        session.on('progress', function () {
            this.setStatus('progress', true);
            startRingbackTone();
            //start playing the ring back tune
        }.bind(this));

        session.on('accepted', function () {
            this.setStatus('accepted', true);
            //stop ringback tone playing
            stopRingbackTone();
        }.bind(this));

        session.on('failed', function () {
            this.setStatus('failed', false);
            if (session === this.session) {
                delete this.session;
                //handle this properly
                stopRingbackTone();
            }
        }.bind(this));

        session.on('bye', function () {
            this.setStatus('bye', false);
            if (session === this.session) {
                delete this.session;
                //do some reset of the UI maybe?
            }
        }.bind(this));

        session.on('refer', session.followRefer(function (req, newSession) {
            this.setStatus('refer', true);
            this.setSession(newSession);
        }.bind(this)));

        this.session = session;
    },

    setStatus: function (status, disable) {
        this.userAgentDiv.className = status; //update the UI with status of the call
        this.inviteButton.disabled = disable;
        this.terminateButton.disabled = !disable;
    },

    terminateSession: function () {
        if (!this.session) {
            return;
        }

        this.session.terminate();
    },

    sendDTMF: function (tone) {
        if (this.session) {
            this.session.dtmf(tone);
        }
    },

    setVolume: function () {
        console.log('Setting volume:', this.volumeRange.value, parseInt(this.volumeRange.value, 10));
        this.remoteMedia.volume = (parseInt(this.volumeRange.value, 10) || 0) / 100;
    },

    toggleMute: function () {
        if (!this.session) {
            return;
        }

        if (this.muteButton.classList.contains('on')) {
            this.session.unmute();
            this.muteButton.classList.remove('on');
        } else {
            this.session.mute();
            this.muteButton.classList.add('on');
        }
    },

};

var MyApp = new MyApp();



function startRingTone() {
    try {
        ringtone.play();
    } catch (e) {}
}

function stopRingTone() {
    try {
        ringtone.pause();
    } catch (e) {}
}

function startRingbackTone() {
    try {
        ringbacktone.play();
    } catch (e) {}
}

function stopRingbackTone() {
    try {
        ringbacktone.pause();
    } catch (e) {}
}