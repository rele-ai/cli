// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var integratedapp_pb = require('./integratedapp_pb.js');
var google_protobuf_struct_pb = require('google-protobuf/google/protobuf/struct_pb.js');

function serialize_integratedapp_NotifyRequest(arg) {
  if (!(arg instanceof integratedapp_pb.NotifyRequest)) {
    throw new Error('Expected argument of type integratedapp.NotifyRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_integratedapp_NotifyRequest(buffer_arg) {
  return integratedapp_pb.NotifyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_integratedapp_NotifyResponse(arg) {
  if (!(arg instanceof integratedapp_pb.NotifyResponse)) {
    throw new Error('Expected argument of type integratedapp.NotifyResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_integratedapp_NotifyResponse(buffer_arg) {
  return integratedapp_pb.NotifyResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// ---------- Hubspot Service ----------
var IntegratedAppsService = exports.IntegratedAppsService = {
  // Notify the integrated application about the message
notify: {
    path: '/integratedapp.IntegratedApps/Notify',
    requestStream: false,
    responseStream: false,
    requestType: integratedapp_pb.NotifyRequest,
    responseType: integratedapp_pb.NotifyResponse,
    requestSerialize: serialize_integratedapp_NotifyRequest,
    requestDeserialize: deserialize_integratedapp_NotifyRequest,
    responseSerialize: serialize_integratedapp_NotifyResponse,
    responseDeserialize: deserialize_integratedapp_NotifyResponse,
  },
};

exports.IntegratedAppsClient = grpc.makeGenericClientConstructor(IntegratedAppsService);
