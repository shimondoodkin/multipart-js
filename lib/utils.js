
exports.error = error;

function error (emitter, message) {
  emitter.error = new Error(message);
  emitter.emit("onError", emitter.error);
  if (emitter.error) throw emitter.error;
}
