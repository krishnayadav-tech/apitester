import "./_snowpack/pkg/bootstrap.js"
import "./_snowpack/pkg/bootstrap/dist/css/bootstrap.min.css.proxy.js"
import axios from "./_snowpack/pkg/axios.js"
import prettyBytes from "./_snowpack/pkg/pretty-bytes.js"
import setupEditors from "./setupEditor.js"

const form = document.querySelector("[data-form]")
const queryParamsContainer = document.querySelector("[data-query-params]")
const requestHeadersContainer = document.querySelector("[data-request-headers]")
const keyValueTemplate = document.querySelector("[data-key-value-template]")
const responseHeadersContainer = document.querySelector(
  "[data-response-headers]"
)

document
  .querySelector("[data-add-query-param-btn]")
  .addEventListener("click", () => {
    queryParamsContainer.append(createKeyValuePair())
  })

document
  .querySelector("[data-add-request-header-btn]")
  .addEventListener("click", () => {
    requestHeadersContainer.append(createKeyValuePair())
  })

axios.interceptors.request.use(request => {
  request.customData = request.customData || {}
  request.customData.startTime = new Date().getTime()
  return request
})

function updateEndTime(response) {
  response.customData = response.customData || {}
  response.customData.time =
    new Date().getTime() - response.config.customData.startTime
  return response
}

axios.interceptors.response.use(updateEndTime, e => {
  return Promise.reject(updateEndTime(e.response))
})

let axiosBuilder = (method,data)=>{
  if(method === 'GET'){
    return {
      url : document.querySelector("[data-url]").value,
      method: document.querySelector("[data-method]").value,
      params: keyValuePairsToObjects(queryParamsContainer),
      headers: keyValuePairsToObjects(requestHeadersContainer),
    };
  }
  return {
    url: document.querySelector("[data-url]").value,
    method: document.querySelector("[data-method]").value,
    params: keyValuePairsToObjects(queryParamsContainer),
    headers: keyValuePairsToObjects(requestHeadersContainer),
    data,
  }
}

const { requestEditor, updateResponseEditor } = setupEditors()
form.addEventListener("submit", e => {
  e.preventDefault()

  let data
  try {
    data = JSON.parse(requestEditor.state.doc.toString() || null)
  } catch (e) {
    alert("JSON data is malformed");
    return
  }
  let method = document.querySelector("[data-method]").value;
  let axiosObj = axiosBuilder(method,data);
  let axiosStr = JSON.stringify(axiosObj);
  localStorage.setItem("setItem",axiosStr);
  axios(axiosObj)
    .catch(e => e)
    .then(response => {
      document
        .querySelector("[data-response-section]")
        .classList.remove("d-none")
      updateResponseDetails(response)
      updateResponseEditor(response.data)
      updateResponseHeaders(response.headers)
    })
})

function updateResponseDetails(response) {
  document.querySelector("[data-status]").textContent = response.status
  document.querySelector("[data-time]").textContent = response.customData.time
  document.querySelector("[data-size]").textContent = prettyBytes(
    JSON.stringify(response.data).length +
      JSON.stringify(response.headers).length
  )
}

function updateResponseHeaders(headers) {
  responseHeadersContainer.innerHTML = ""
  Object.entries(headers).forEach(([key, value]) => {
    const keyElement = document.createElement("div")
    keyElement.textContent = key
    responseHeadersContainer.append(keyElement)
    const valueElement = document.createElement("div")
    valueElement.textContent = value
    responseHeadersContainer.append(valueElement)
  })
}

function createKeyValuePair(item) {
  const element = keyValueTemplate.content.cloneNode(true)
  element.querySelector("input[placeholder='Key']").value = item?item.Key:"";
  element.querySelector("input[placeholder='Value']").value = item?item.Value:"";;
  element.querySelector("[data-remove-btn]").addEventListener("click", e => {
    e.target.closest("[data-key-value-pair]").remove()
  })
  return element
}

function keyValuePairsToObjects(container) {
  const pairs = container.querySelectorAll("[data-key-value-pair]")
  return [...pairs].reduce((data, pair) => {
    const key = pair.querySelector("[data-key]").value
    const value = pair.querySelector("[data-value]").value

    if (key === "") return data
    return { ...data, [key]: value }
  }, {})
}

let fetchFromLocalStorage = ()=>{
  let data = localStorage.getItem("setItem");
  if(!data){
    return;
  }
  data = JSON.parse(data);
  let inputField = document.querySelector("input[type='url']");
  let methodType = document.querySelector(".methodtype");
  methodType.value = data.method;
  inputField.value = data.url;
  for (const Key in data.params) {
    queryParamsContainer.append(createKeyValuePair({Key,Value:data.params[Key]}));
  }
  for (const Key in data.headers) {
    requestHeadersContainer.append(createKeyValuePair({Key,Value:data.headers[Key]}));
  }
  // cm content 
  let jsonHolder = document.querySelector(".cm-content");
  jsonHolder.innerHTML = "";
  let element = document.createElement("div");
  element.setAttribute("class","cm-line");
  element.innerHTML = "{";
  jsonHolder.appendChild(element);
  for (const Key in data.data) {
    element = document.createElement("div");
    element.setAttribute("class","cm-line");
    element.innerHTML = `  "${Key}": "${data.data[Key]}"`
    jsonHolder.appendChild(element);
  }
  element = document.createElement("div");
  element.setAttribute("class","cm-line");
  element.innerHTML = "}";
  jsonHolder.appendChild(element);
}
fetchFromLocalStorage();
queryParamsContainer.append(createKeyValuePair())
requestHeadersContainer.append(createKeyValuePair())