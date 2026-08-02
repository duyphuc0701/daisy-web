const ApiError = require("../errors/api-error");
function parseSingleRange(value, size) {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new ApiError(502, "Audio object metadata is unavailable");
  }
  if (!value) return null;
  if (Array.isArray(value) || !/^bytes=(?:\d*-\d*)$/.test(value)) {
    throw new ApiError(416, "Requested audio range is not satisfiable", {
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  const [, startText, endText] = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!startText && !endText) return invalid(size);
  let start;
  let end;
  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid(size);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : size - 1;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start >= size ||
      end < start
    )
      return invalid(size);
    end = Math.min(end, size - 1);
  }
  return {
    start,
    end,
    length: end - start + 1,
    header: `bytes=${start}-${end}`,
  };
}
function invalid(size) {
  throw new ApiError(416, "Requested audio range is not satisfiable", {
    headers: { "Content-Range": `bytes */${size}` },
  });
}
module.exports = { parseSingleRange };
