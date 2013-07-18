/* global WebRTC, tnetbin,
          afterEach, beforeEach, chai, describe, sinon, it */

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
  var audioStreamTrack = {enabled:true};
  var videoStreamTrack = {enabled:true};

  var mediaStream = {
    getAudioTracks: function() {
      return [audioStreamTrack];
    },
    getVideoTracks: function() {
      return [videoStreamTrack];
    }
  };

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
      },
      getLocalStreams: function() {
        return [mediaStream];
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
    webrtc = null;
    sandbox.restore();
  });

  describe("constructor", function() {
    it("should accept and configure options", function() {
      var webrtc = new WebRTC({forceFake: true});

      expect(webrtc.options.forceFake).to.deep.equal(true);
    });

    it("should setup and configure a state machine", function() {
      var webrtc = new WebRTC();

      expect(webrtc.state).to.be.an('object');
      expect(webrtc.state.current).to.equal('ready');
    });
  });

  describe("constraints property", function() {
    it("should register constraints regarding the `forceFake` option",
      function() {
        var webrtc = new WebRTC({forceFake: true});

        expect(webrtc.constraints.fake).to.equal(true);
      });
  });

  describe("static methods", function () {
    describe("#parseOfferConstraints", function() {
      it("should parse an offer SDP to retrieve media constraints", function() {
        var constraints = WebRTC.parseOfferConstraints(fakeOffer);

        expect(constraints.audio).to.equal(true);
        expect(constraints.video).to.equal(true);
      });

      it("should throw if no valid offer passed", function() {
        expect(function() {
          WebRTC.parseOfferConstraints({});
        }).to.Throw(Error);
      });
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
      webrtc.off();
    });

    describe("#initiate", function() {
      it("should setup and configure a peer connection", function() {
        var webrtc = new WebRTC();
        webrtc.initiate();

        expect(webrtc.pc).to.be.a('object');
        expect(webrtc.pc.onaddstream).to.be.a('function');
        expect(webrtc.pc.ondatachannel).to.be.a('function');
        expect(webrtc.pc.oniceconnectionstatechange).to.be.a('function');
        expect(webrtc.pc.onremovestream).to.be.a('function');
        expect(webrtc.pc.onsignalingstatechange).to.be.a('function');
      });

      it("should setup and configure a data channel", function() {
        var webrtc = new WebRTC();
        webrtc.initiate();

        expect(webrtc.dc).to.deep.equal(fakeDataChannel);
      });

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
          sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
            this.pc = {
              createOffer: sandbox.stub()
            };
          });
          var webrtc = new WebRTC();

          webrtc.initiate();

          sinon.assert.calledOnce(webrtc.pc.createOffer);
        });

      describe("#initiate events", function() {
        it("should emit the `remote-stream:ready` event when a remote media " +
           "stream is added to the peer connection",
          function(done) {
            var webrtc = new WebRTC();
            webrtc.on('remote-stream:ready', function() {
              done();
            }).initiate();

            webrtc.pc.onaddstream({});
          });

        it("should emit signaling state change events", function(done) {
          var webrtc = new WebRTC();
          webrtc.on('signaling:have-local-offer', function() {
            done();
          }).initiate();

          webrtc.pc.onsignalingstatechange('have-local-offer');
        });

        it("should emit ice connection state change events", function(done) {
          var webrtc = new WebRTC();
          webrtc.on('ice:closed', function() {
            done();
          }).initiate();
          webrtc.pc.iceConnectionState = 'closed';

          webrtc.pc.oniceconnectionstatechange();
        });

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
        webrtc.initiate({video: false}).establish({}).upgrade({video: true});

        expect(webrtc.constraints.video).to.equal(true);
      });

      it("should throw if no new media constraints are provided", function() {
        webrtc.initiate({video: true}).establish({});

        expect(webrtc.upgrade).to.Throw(Error);
      });

      it("should transition state to `pending`", function() {
        webrtc.initiate({video: false}).establish({}).upgrade({video: true});

        expect(webrtc.state.current).to.equal('pending');
      });

      it("should initiate a new peer connection using provided constraints",
        function(done) {
          var newConstraints = {video: true, audio: true};

          webrtc.on('connection-upgraded', function() {
            expect(this.constraints.video).to.equal(true);
            expect(this.constraints.audio).to.equal(true);
            done();
          }).initiate().establish({}).upgrade(newConstraints);

          webrtc.trigger('connection-terminated').trigger('ice:connected');
        });

      describe("#upgrade events", function() {
        it("should emit a `state:upgrade` event", function(done) {
          webrtc.once('state:upgrade', function() {
            done();
          }).initiate().establish({}).upgrade({});
        });

        it("should emit a `state:to:pending` event", function(done) {
          webrtc.once('state:to:pending', function() {
            done();
          }).initiate().establish({}).upgrade({});
        });
      });
    });

    describe("#answer", function() {
      it("should setup and configure a peer connection", function() {
        var webrtc = new WebRTC();
        webrtc.answer(fakeOffer);

        expect(webrtc.pc).to.be.a('object');
        expect(webrtc.pc.onaddstream).to.be.a('function');
        expect(webrtc.pc.ondatachannel).to.be.a('function');
        expect(webrtc.pc.oniceconnectionstatechange).to.be.a('function');
        expect(webrtc.pc.onremovestream).to.be.a('function');
        expect(webrtc.pc.onsignalingstatechange).to.be.a('function');
      });

      it("should setup and configure a data channel", function() {
        var webrtc = new WebRTC();
        webrtc.answer(fakeOffer);

        expect(webrtc.dc).to.deep.equal(fakeDataChannel);
      });

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
      beforeEach(function() {
        webrtc.initiate({}).establish({});
      });

      it("shouldn't allow sending data if connection is not established",
        function() {
          expect(webrtc.send).throws(Error);
        });

      it("should send data over data channel",
        function() {
          webrtc.send("plop");

          sinon.assert.calledOnce(webrtc.dc.send);
          sinon.assert.calledWithExactly(webrtc.dc.send,
                                         tnetbin.encode('plop'));
        });

      describe("#send events", function() {
        it("should emit the `dc:message-out` event", function(done) {
          webrtc.once("dc:message-out", function(data) {
            expect(data).to.deep.equal(tnetbin.encode("plop"));
            done();
          }).send("plop");
        });
      });
    });

    describe("#terminate", function() {
      beforeEach(function() {
        webrtc.initiate();
      });

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

    describe("#setMuteState", function() {
      beforeEach(function() {
        webrtc = new WebRTC();
        webrtc.initiate();
        audioStreamTrack.enabled = true;
        videoStreamTrack.enabled = true;
      });

      it("should set the mute status for audio tracks", function() {
        webrtc.setMuteState('audio', true);

        expect(audioStreamTrack.enabled).to.be.equal(false);
        expect(videoStreamTrack.enabled).to.be.equal(true);
      });

      it("should set the mute status for video tracks", function() {
        webrtc.setMuteState('video', true);

        expect(audioStreamTrack.enabled).to.be.equal(true);
        expect(videoStreamTrack.enabled).to.be.equal(false);
      });
    });
  });

  describe("Error handling", function() {
    beforeEach(function() {
      webrtc = new WebRTC();
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
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            addStream: function() {
              throw new Error('addStream error');
            },
            setLocalDescription: function(obj, success) {
              success(obj);
            },
            createOffer: function(success) {
              success();
            }
          };
        });

        webrtc.once("error", function(message) {
          expect(message).to.contain("addStream error");
          done();
        }).initiate({video: true, audio: true});
      });

      it("should handle errors from pc.createOffer", function(done) {
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            createOffer: function(success, error) {
              error(new Error("createOffer error"));
            }
          };
        });

        webrtc.once("error", function(message) {
          expect(message).to.contain("createOffer error");
          done();
        }).initiate();
      });

      it("should handle errors from pc.setLocalDescription", function(done) {
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            createOffer: function(success) {
              success();
            },
            setLocalDescription: function(obj, success, error) {
              error(new Error("setLocalDescription error"));
            }
          };
        });

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
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            addStream: function() {
              throw new Error('addStream error');
            },
            createAnswer: function(success) {
              success();
            },
            setLocalDescription: function(obj, success) {
              success(obj);
            },
            setRemoteDescription: function(obj, success) {
              success(obj);
            }
          };
        });

        webrtc.once("error", function(message) {
          expect(message).to.contain("addStream error");
          done();
        }).answer(fakeOffer);
      });

      it("should handle errors from pc.setLocalDescription", function(done) {
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            addStream: sinon.spy(),
            setLocalDescription: function(obj, success, error) {
              error(new Error("setLocalDescription error"));
            },
            setRemoteDescription: function(obj, success) {
              success(obj);
            },
            createAnswer: function(success) {
              success();
            }
          };
        });

        webrtc.once("error", function(message) {
          expect(message).to.contain("setLocalDescription error");
          done();
        }).answer(fakeOffer);
      });

      it("should handle errors from pc.createAnswer", function(done) {
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            addStream: sinon.spy(),
            setRemoteDescription: function(obj, success) {
              success(obj);
            },
            createAnswer: function(success, error) {
              error(new Error("createAnswer error"));
            }
          };
        });

        webrtc.once("error", function(message) {
          expect(message).to.contain("createAnswer error");
          done();
        }).answer(fakeOffer);
      });
    });

    describe("#establish error handling", function() {
      it("should handle errors from setRemoteDescription", function(done) {
        sandbox.stub(WebRTC.prototype, "_setupPeerConnection", function() {
          this.pc = {
            createOffer: function(success) {
              success();
            },
            setLocalDescription: function(obj, success) {
              success(obj);
            },
            setRemoteDescription: function(obj, success, error) {
              error(new Error("setRemoteDescription error"));
            }
          };
        });

        webrtc.on("error", function(message) {
          expect(message).to.contain("setRemoteDescription error");
          done();
        }).initiate().establish(fakeOffer);
      });
    });
  });

  describe("Data Channel handling", function() {
    beforeEach(function() {
      webrtc = new WebRTC();
    });

    it("should emit a 'dc:ready' event on open", function(done) {
      webrtc.once('dc:ready', function(dc) {
        expect(dc).to.be.equal(webrtc.dc);
        done();
      }).initiate();

      webrtc.dc.onopen();
    });

    it("should emit a 'dc:message-in' event on receiving a message",
      function(done) {
        var message = {data: tnetbin.encode("fake")};
        webrtc.once('dc:message-in', function(event) {
          expect(event).to.equal("fake");
          done();
        }).initiate();

        webrtc.dc.onmessage(message);
      });

    it("should emit a 'dc:error' event on receiving an error",
      function(done) {
        var message = {data: "fake"};
        webrtc.once('dc:error', function(event) {
          expect(event).to.deep.equal(message);
          done();
        }).initiate();

        webrtc.dc.onerror(message);
      });

    it("should emit a 'dc:close' event on being closed", function(done) {
      webrtc.once('dc:close', function() {
        done();
      }).initiate();

      webrtc.dc.onclose();
    });
  });
});
