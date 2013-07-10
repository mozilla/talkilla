/* global WebRTC, afterEach, beforeEach, chai, describe, sinon, it*/

var expect = chai.expect;

describe("WebRTC", function() {
  function fakeSDP(str) {
    return {
      str: str,
      contains: function(what) {
        return this.str.indexOf(what) !== -1;
      }
    };
  }

  var sandbox, webrtc;

  var fakeOffer = {type: "offer", sdp: fakeSDP("\nm=video aaa\nm=audio bbb")};
  var fakeAnswer = {type: "answer", sdp: fakeSDP("\nm=video ccc\nm=audio ddd")};
  var fakeStream = {fakeStream: true};
  var fakeDataChannel = {fakeDataChannel: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozRTCPeerConnection stub
    sandbox.stub(window, "mozRTCPeerConnection").returns({
      close: sandbox.spy(),
      addStream: sandbox.spy(),
      createAnswer: function(success) {
        success(fakeAnswer);
      },
      createOffer: function(success) {
        success(fakeOffer);
      },
      setLocalDescription: function(source, success) {
        success(source);
      },
      setRemoteDescription: function(source, success) {
        success(source);
      },
      createDataChannel: function() {
        fakeDataChannel.send = sandbox.spy();
        return fakeDataChannel;
      }
    });

    // mozRTCSessionDescription stub
    sandbox.stub(window, "mozRTCSessionDescription", function(obj) {
      return obj;
    });

    // mozGetUserMedia stub
    sandbox.stub(window.navigator, "mozGetUserMedia",
      function(constraints, success) {
        success(fakeStream);
      });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("constructor", function() {
    it("should accept and configure options", function() {
      var fakeServers = [{foo: 1}, {bar: 2}];
      var webrtc = new WebRTC({iceServers: fakeServers, forceFake: true});

      expect(webrtc.options.iceServers).to.deep.equal(fakeServers);
      expect(webrtc.options.forceFake).to.deep.equal(true);
    });

    it("should setup and configure a peer connection", function() {
      var webrtc = new WebRTC();

      expect(webrtc.pc).to.be.a('object');
      expect(webrtc.pc.onaddstream).to.be.a('function');
      expect(webrtc.pc.ondatachannel).to.be.a('function');
      expect(webrtc.pc.oniceconnectionstatechange).to.be.a('function');
      expect(webrtc.pc.onremovestream).to.be.a('function');
      expect(webrtc.pc.onsignalingstatechange).to.be.a('function');
    });

    it("should setup and configure a data channel", function() {
      var webrtc = new WebRTC();

      expect(webrtc.dc).to.deep.equal(fakeDataChannel);
    });

    it("should setup and configure a state machine", function() {
      var webrtc = new WebRTC();

      expect(webrtc.state).to.be.an('object');
      expect(webrtc.state.current).to.equal('ready');
    });

    describe("constructor events", function() {
      it("should emit the `remote-stream:ready` event when a remote media " +
         "stream is added to the peer connection",
        function(done) {
          var webrtc = new WebRTC();
          webrtc.on('remote-stream:ready', function() {
            done();
          });

          webrtc.pc.onaddstream({});
        });

      it("should emit signaling state change events", function(done) {
        var webrtc = new WebRTC();
        webrtc.on('signaling:have-local-offer', function() {
          done();
        });

        webrtc.pc.onsignalingstatechange('have-local-offer');
      });

      it("should emit ice connection state change events", function(done) {
        var webrtc = new WebRTC();
        webrtc.pc.iceConnectionState = 'closed';
        webrtc.on('ice:closed', function() {
          done();
        });

        webrtc.pc.oniceconnectionstatechange();
      });
    });
  });

  describe("constraints property", function() {
    it("should register constraints regarding the `forceFake` option",
      function() {
        var webrtc = new WebRTC({forceFake: true});

        expect(webrtc.constraints.fake).to.equal(true);
      });
  });

  describe("prototype", function() {
    beforeEach(function() {
      webrtc = new WebRTC();
      webrtc.on('error', function(message) {
        throw new Error(message);
      });
    });

    afterEach(function() {
      webrtc.terminate().off();
    });

    describe("#initiate", function() {
      it("should accept media constraints", function() {
        webrtc.initiate({audio: true, video: true, fake: true});

        expect(webrtc.constraints.audio).to.equal(true);
        expect(webrtc.constraints.video).to.equal(true);
        expect(webrtc.constraints.fake).to.equal(true);
      });

      it("should use default media constraints if none provided", function() {
        webrtc.initiate();

        expect(webrtc.constraints.audio).to.equal(false);
        expect(webrtc.constraints.video).to.equal(false);
        expect(webrtc.constraints.fake).to.equal(false);
      });

      it("should transition state to `pending`", function() {
        webrtc.initiate();

        expect(webrtc.state.current).to.equal('pending');
      });

      it("should add a video media stream to peer connection once obtained",
        function() {
          webrtc.initiate({video: true});

          sinon.assert.calledOnce(webrtc.pc.addStream);
        });

      it("should add an audio media stream to peer connection once obtained",
        function() {
          webrtc.initiate({audio: true});

          sinon.assert.calledOnce(webrtc.pc.addStream);
        });

      it("should add an AV media stream to peer connection once obtained",
        function() {
          webrtc.initiate({video: true, audio: true});

          sinon.assert.calledOnce(webrtc.pc.addStream);
        });

      it("should not add media stream if none is requested",
        function() {
          webrtc.initiate({video: false, audio: false});

          sinon.assert.notCalled(webrtc.pc.addStream);
        });

      it("should create an offer from the peer connection object",
        function() {
          sandbox.stub(webrtc.pc, "createOffer");

          webrtc.initiate();

          sinon.assert.calledOnce(webrtc.pc.createOffer);
        });

      describe("#initiate events", function() {
        it("should emit a `change:state` event", function(done) {
          webrtc.once('change:state', function(to, from, event) {
            expect(event).to.equal('initiate');
            expect(from).to.equal('ready');
            expect(to).to.equal('pending');
            done();
          }).initiate();
        });

        it("should emit a `state:initiate` event", function(done) {
          webrtc.once('state:initiate', function() {
            done();
          }).initiate();
        });

        it("should emit a `state:to:pending` event", function(done) {
          webrtc.once('state:to:pending', function() {
            done();
          }).initiate();
        });

        it("should emit the `local-stream:ready` event when local stream is " +
           "ready",
          function(done) {
            webrtc.once('local-stream:ready', function(stream) {
              expect(stream).to.deep.equal(fakeStream);
              done();
            }).initiate({video: true, audio: true});
          });

        it("should emit the `offer-ready` event when the offer is ready",
          function(done) {
            webrtc.once('offer-ready', function(offer) {
              expect(offer).to.deep.equal(fakeOffer);
              done();
            }).initiate();
          });
      });
    });

    describe("#upgrade", function() {
      it("should accept new media constraints", function() {
        webrtc.state.current = 'ongoing';

        webrtc.upgrade({audio: true, video: true});

        expect(webrtc.constraints.audio).to.equal(true);
        expect(webrtc.constraints.video).to.equal(true);
      });

      it("should throw if no new media constraints are provided", function() {
        webrtc.state.current = 'ongoing';
        function shouldThrow() {
          webrtc.upgrade();
        }

        expect(shouldThrow).to.Throw(Error);
      });

      it("should transition state to `pending`", function() {
        webrtc.state.current = 'ongoing';

        webrtc.upgrade({audio: true, video: true});

        expect(webrtc.state.current).to.equal('pending');
      });

      it("should initiate a new peer connection using provided constraints",
        function() {
          webrtc.state.current = 'ongoing';
          sandbox.stub(webrtc, "initiate");
          var newConstraints = {audio: true, video: true};

          webrtc.upgrade(newConstraints);

          sinon.assert.calledOnce(webrtc.initiate);
          sinon.assert.calledWithExactly(webrtc.initiate, newConstraints);
        });

      describe("#upgrade events", function() {
        it("should emit a `state:upgrade` event", function(done) {
            webrtc.state.current = 'ongoing';
            webrtc.once('state:upgrade', function() {
              done();
            }).upgrade({audio: true, video: true});
          });

        it("should emit a `state:to:pending` event", function(done) {
          webrtc.state.current = 'ongoing';
          webrtc.once('state:to:pending', function() {
            done();
          }).upgrade({audio: true, video: true});
        });
      });
    });

    describe("#answer", function() {
      it("should transition state to `ongoing`", function() {
        webrtc.answer(fakeOffer);

        expect(webrtc.state.current).to.equal('ongoing');
      });

      it("should transition state to `ongoing` on upgrade", function() {
        webrtc.state.current = "ongoing";
        webrtc.answer(fakeOffer);

        expect(webrtc.state.current).to.equal('ongoing');
      });

      it("should extract media constraints from incoming offer", function() {
        webrtc.answer(fakeOffer);

        expect(webrtc.constraints.video).to.equal(true);
        expect(webrtc.constraints.audio).to.equal(true);
      });

      it("should extract media constraints from a different incoming offer",
        function() {
          webrtc.answer({type: "answer", sdp: fakeSDP("\nm=audio ddd")});

          expect(webrtc.constraints.video).to.equal(false);
          expect(webrtc.constraints.audio).to.equal(true);
        });

      describe("#answer events", function() {
        it("should emit a `change:state` event", function(done) {
          webrtc.once('change:state', function(to, from, event) {
            expect(event).to.equal('answer');
            expect(from).to.equal('ready');
            expect(to).to.equal('ongoing');
            done();
          }).answer(fakeOffer);
        });

        it("should emit a `state:initiate` event", function(done) {
          webrtc.once('state:answer', function() {
            done();
          }).answer(fakeOffer);
        });

        it("should emit a `state:to:pending` event", function(done) {
          webrtc.once('state:to:ongoing', function() {
            done();
          }).answer(fakeOffer);
        });

        it("should emit the `local-stream:ready` event when local stream is " +
           "ready",
          function(done) {
            webrtc.once('local-stream:ready', function(stream) {
              expect(stream).to.deep.equal(fakeStream);
              done();
            }).answer(fakeOffer);
          });

        it("should emit the `answer-ready` event when the answer is ready",
          function(done) {
            webrtc.once('answer-ready', function(answer) {
              expect(answer).to.deep.equal(fakeAnswer);
              done();
            }).answer(fakeOffer);
          });
      });
    });

    describe("#establish", function() {
      var offerer, answerer;

      beforeEach(function() {
        offerer = new WebRTC();
        answerer = new WebRTC();
      });

      afterEach(function() {
        offerer.terminate().off();
        answerer.terminate().off();
      });

      it("should establish an ongoing communication", function(done) {
        offerer.once('offer-ready', function(offer) {
          answerer.once('answer-ready', function(answer) {
            offerer.establish(answer);
            expect(offerer.state.current).to.equal('ongoing');
            expect(answerer.state.current).to.equal('ongoing');
            done();
          }).answer(offer);
        }).initiate();
      });

      describe("events", function() {
        it("should emit the `connection-established` event when the " +
           "communication is established",
          function(done) {
            offerer.once('offer-ready', function(offer) {
              answerer.once('answer-ready', function(answer) {
                offerer.once('connection-established', function() {
                  done();
                }).establish(answer).trigger('ice:connected');
              }).answer(offer);
            }).initiate();
          });
      });
    });

    describe("#send", function() {
      it("shouldn't allow sending data if connection is not established",
        function() {
          expect(webrtc.send).throws(Error);
        });

      it("should send data over data channel",
        function() {
          webrtc.state.current = "ongoing";

          webrtc.send("plop");

          sinon.assert.calledOnce(webrtc.dc.send);
          sinon.assert.calledWithExactly(webrtc.dc.send, 'plop');
        });

      describe("#send events", function() {
        it("should emit the `dc:message-out` event", function(done) {
          webrtc.state.current = "ongoing";

          webrtc.once("dc:message-out", function(data) {
            expect(data).to.deep.equal("plop");
            done();
          }).send("plop");
        });
      });
    });

    describe("#terminate", function() {
      it("should close the peer connection", function() {
        webrtc.terminate();

        sinon.assert.calledOnce(webrtc.pc.close);
      });

      it("should transition state to `terminated`", function() {
        webrtc.terminate();

        expect(webrtc.state.current).to.equal('terminated');
      });

      describe("#terminate events", function() {
        it("should emit the `connection-terminated` event", function(done) {
          webrtc.once('connection-terminated', function() {
            done();
          }).terminate().trigger('ice:closed');
        });
      });
    });
  });

  describe("Error handling", function() {
    beforeEach(function() {
      webrtc = new WebRTC();
    });

    afterEach(function() {
      webrtc.terminate().off();
    });

    describe("#initiate error handling", function() {
      it("should handle errors from gUM", function(done) {
        navigator.mozGetUserMedia = function(c, s, error) {
          error(new Error("gUM error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("gUM error");
          done();
        }).initiate({video: true, audio: true});
      });

      it("should handle errors from pc.addStream", function(done) {
        webrtc.pc.addStream = function() {
          throw new Error('addStream error');
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("addStream error");
          done();
        }).initiate({video: true, audio: true});
      });

      it("should handle errors from pc.createOffer", function(done) {
        webrtc.pc.createOffer = function(success, error) {
          error(new Error("createOffer error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("createOffer error");
          done();
        }).initiate();
      });

      it("should handle errors from pc.setLocalDescription", function(done) {
        webrtc.pc.setLocalDescription = function(obj, success, error) {
          error(new Error("setLocalDescription error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("setLocalDescription error");
          done();
        }).initiate();
      });
    });

    describe("#answer error handling", function() {
      it("should handle errors from gUM", function(done) {
        navigator.mozGetUserMedia = function(c, s, error) {
          error(new Error("gUM error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("gUM error");
          done();
        }).answer(fakeOffer);
      });

      it("should handle errors from pc.addStream", function(done) {
        webrtc.pc.addStream = function() {
          throw new Error('addStream error');
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("addStream error");
          done();
        }).answer(fakeOffer);
      });

      it("should handle errors from pc.setLocalDescription", function(done) {
        webrtc.pc.setLocalDescription = function(obj, success, error) {
          error(new Error("setLocalDescription error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("setLocalDescription error");
          done();
        }).answer(fakeOffer);
      });

      it("should handle errors from pc.createAnswer", function(done) {
        webrtc.pc.createAnswer = function(success, error) {
          error(new Error("createAnswer error"));
        };

        webrtc.once("error", function(message) {
          expect(message).to.contain("createAnswer error");
          done();
        }).answer(fakeOffer);
      });
    });

    describe("#establish error handling", function() {
      it("should handle errors from setRemoteDescription", function(done) {
        webrtc.pc.setRemoteDescription = function(obj, success, error) {
          error(new Error("setRemoteDescription error"));
        };

        webrtc.on("error", function(message) {
          expect(message).to.contain("setRemoteDescription error");
          done();
        }).initiate().establish(fakeOffer);
      });
    });
  });
});
