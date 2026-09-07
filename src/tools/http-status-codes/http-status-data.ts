export interface HttpStatusCode {
  code: number
  name: string
  description: string
  category: "1xx" | "2xx" | "3xx" | "4xx" | "5xx"
}

export const httpStatusCodes: HttpStatusCode[] = [
  // 1xx Informational
  {
    code: 100,
    name: "Continue",
    description:
      "The server has received the request headers and the client should proceed to send the request body.",
    category: "1xx",
  },
  {
    code: 101,
    name: "Switching Protocols",
    description: "The server is switching protocols as requested by the client via Upgrade header.",
    category: "1xx",
  },
  {
    code: 102,
    name: "Processing",
    description:
      "The server has received and is processing the request, but no response is available yet.",
    category: "1xx",
  },
  {
    code: 103,
    name: "Early Hints",
    description: "Used to return some response headers before final HTTP message.",
    category: "1xx",
  },

  // 2xx Success
  { code: 200, name: "OK", description: "The request has succeeded.", category: "2xx" },
  {
    code: 201,
    name: "Created",
    description: "The request has been fulfilled and a new resource has been created.",
    category: "2xx",
  },
  {
    code: 202,
    name: "Accepted",
    description:
      "The request has been accepted for processing, but the processing has not been completed.",
    category: "2xx",
  },
  {
    code: 203,
    name: "Non-Authoritative Information",
    description:
      "The returned meta-information is from a local or third-party copy, not the origin server.",
    category: "2xx",
  },
  {
    code: 204,
    name: "No Content",
    description: "The server has fulfilled the request but does not need to return an entity-body.",
    category: "2xx",
  },
  {
    code: 205,
    name: "Reset Content",
    description:
      "The server has fulfilled the request and the user agent should reset the document view.",
    category: "2xx",
  },
  {
    code: 206,
    name: "Partial Content",
    description: "The server has fulfilled the partial GET request for the resource.",
    category: "2xx",
  },
  {
    code: 207,
    name: "Multi-Status",
    description: "The message body that follows is an XML message with multiple response codes.",
    category: "2xx",
  },
  {
    code: 208,
    name: "Already Reported",
    description: "The members of a DAV binding have already been enumerated in a previous reply.",
    category: "2xx",
  },
  {
    code: 226,
    name: "IM Used",
    description:
      "The server has fulfilled a GET request for the resource with instance manipulations applied.",
    category: "2xx",
  },

  // 3xx Redirection
  {
    code: 300,
    name: "Multiple Choices",
    description: "The requested resource corresponds to any one of a set of representations.",
    category: "3xx",
  },
  {
    code: 301,
    name: "Moved Permanently",
    description: "The requested resource has been assigned a new permanent URI.",
    category: "3xx",
  },
  {
    code: 302,
    name: "Found",
    description: "The requested resource resides temporarily under a different URI.",
    category: "3xx",
  },
  {
    code: 303,
    name: "See Other",
    description:
      "The response to the request can be found under a different URI and should be retrieved using GET.",
    category: "3xx",
  },
  {
    code: 304,
    name: "Not Modified",
    description:
      "The client has performed a conditional GET and access is allowed, but the document has not been modified.",
    category: "3xx",
  },
  {
    code: 305,
    name: "Use Proxy",
    description:
      "The requested resource must be accessed through the proxy given by the Location field.",
    category: "3xx",
  },
  {
    code: 307,
    name: "Temporary Redirect",
    description: "The requested resource resides temporarily under a different URI.",
    category: "3xx",
  },
  {
    code: 308,
    name: "Permanent Redirect",
    description: "The requested resource has been assigned a new permanent URI.",
    category: "3xx",
  },

  // 4xx Client Error
  {
    code: 400,
    name: "Bad Request",
    description: "The server could not understand the request due to malformed syntax.",
    category: "4xx",
  },
  {
    code: 401,
    name: "Unauthorized",
    description: "The request requires user authentication.",
    category: "4xx",
  },
  {
    code: 402,
    name: "Payment Required",
    description: "Reserved for future use — intended for digital payment systems.",
    category: "4xx",
  },
  {
    code: 403,
    name: "Forbidden",
    description: "The server understood the request, but is refusing to fulfill it.",
    category: "4xx",
  },
  {
    code: 404,
    name: "Not Found",
    description: "The server has not found anything matching the Request-URI.",
    category: "4xx",
  },
  {
    code: 405,
    name: "Method Not Allowed",
    description:
      "The method specified in the Request-Line is not allowed for the identified resource.",
    category: "4xx",
  },
  {
    code: 406,
    name: "Not Acceptable",
    description:
      "The resource identified by the request is only capable of generating response entities not acceptable.",
    category: "4xx",
  },
  {
    code: 407,
    name: "Proxy Authentication Required",
    description: "The client must first authenticate itself with the proxy.",
    category: "4xx",
  },
  {
    code: 408,
    name: "Request Timeout",
    description:
      "The server did not receive a complete request message within the time it was prepared to wait.",
    category: "4xx",
  },
  {
    code: 409,
    name: "Conflict",
    description:
      "The request could not be completed due to a conflict with the current state of the resource.",
    category: "4xx",
  },
  {
    code: 410,
    name: "Gone",
    description:
      "The requested resource is no longer available and no forwarding address is known.",
    category: "4xx",
  },
  {
    code: 411,
    name: "Length Required",
    description: "The server refuses to accept the request without a defined Content-Length.",
    category: "4xx",
  },
  {
    code: 412,
    name: "Precondition Failed",
    description: "The precondition given in the request header evaluated to false.",
    category: "4xx",
  },
  {
    code: 413,
    name: "Payload Too Large",
    description:
      "The server is refusing to process a request because the request payload is larger than the server is willing to process.",
    category: "4xx",
  },
  {
    code: 414,
    name: "URI Too Long",
    description:
      "The server is refusing to service the request because the Request-URI is longer than the server is willing to interpret.",
    category: "4xx",
  },
  {
    code: 415,
    name: "Unsupported Media Type",
    description:
      "The server is refusing to service the request because the entity of the request is in an unsupported format.",
    category: "4xx",
  },
  {
    code: 416,
    name: "Range Not Satisfiable",
    description: "The requested range cannot be satisfied by the server.",
    category: "4xx",
  },
  {
    code: 417,
    name: "Expectation Failed",
    description:
      "The server is unable to meet the expectations given in the Expect request header.",
    category: "4xx",
  },
  {
    code: 418,
    name: "I'm a Teapot",
    description: "The server refuses to brew coffee because it is, permanently, a teapot.",
    category: "4xx",
  },
  {
    code: 421,
    name: "Misdirected Request",
    description: "The request was directed at a server that is not able to produce a response.",
    category: "4xx",
  },
  {
    code: 422,
    name: "Unprocessable Content",
    description:
      "The server understands the content type but was unable to process the contained instructions.",
    category: "4xx",
  },
  {
    code: 423,
    name: "Locked",
    description: "The source or destination resource of a method is locked.",
    category: "4xx",
  },
  {
    code: 424,
    name: "Failed Dependency",
    description:
      "The method could not be performed because the requested action depended on another action that failed.",
    category: "4xx",
  },
  {
    code: 425,
    name: "Too Early",
    description: "The server is unwilling to risk processing a request that might be replayed.",
    category: "4xx",
  },
  {
    code: 426,
    name: "Upgrade Required",
    description: "The client should switch to a different protocol.",
    category: "4xx",
  },
  {
    code: 428,
    name: "Precondition Required",
    description: "The origin server requires the request to be conditional.",
    category: "4xx",
  },
  {
    code: 429,
    name: "Too Many Requests",
    description: "The user has sent too many requests in a given amount of time.",
    category: "4xx",
  },
  {
    code: 431,
    name: "Request Header Fields Too Large",
    description:
      "The server is unwilling to process the request because its header fields are too large.",
    category: "4xx",
  },
  {
    code: 451,
    name: "Unavailable For Legal Reasons",
    description: "The server is denying access to the resource as a consequence of a legal demand.",
    category: "4xx",
  },

  // 5xx Server Error
  {
    code: 500,
    name: "Internal Server Error",
    description:
      "The server encountered an unexpected condition which prevented it from fulfilling the request.",
    category: "5xx",
  },
  {
    code: 501,
    name: "Not Implemented",
    description: "The server does not support the functionality required to fulfill the request.",
    category: "5xx",
  },
  {
    code: 502,
    name: "Bad Gateway",
    description:
      "The server, while acting as a gateway or proxy, received an invalid response from the upstream server.",
    category: "5xx",
  },
  {
    code: 503,
    name: "Service Unavailable",
    description:
      "The server is currently unable to handle the request due to temporary overloading or maintenance.",
    category: "5xx",
  },
  {
    code: 504,
    name: "Gateway Timeout",
    description:
      "The server, while acting as a gateway or proxy, did not receive a timely response from the upstream server.",
    category: "5xx",
  },
  {
    code: 505,
    name: "HTTP Version Not Supported",
    description:
      "The server does not support the HTTP protocol version that was used in the request.",
    category: "5xx",
  },
  {
    code: 506,
    name: "Variant Also Negotiates",
    description: "Transparent content negotiation for the request results in a circular reference.",
    category: "5xx",
  },
  {
    code: 507,
    name: "Insufficient Storage",
    description:
      "The method could not be performed because the server is unable to store the representation needed.",
    category: "5xx",
  },
  {
    code: 508,
    name: "Loop Detected",
    description: "The server detected an infinite loop while processing the request.",
    category: "5xx",
  },
  {
    code: 510,
    name: "Not Extended",
    description: "Further extensions to the request are required for the server to fulfill it.",
    category: "5xx",
  },
  {
    code: 511,
    name: "Network Authentication Required",
    description: "The client needs to authenticate to gain network access.",
    category: "5xx",
  },
]
