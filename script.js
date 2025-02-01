// Global variables
const historyFile = "history.json"
let previousPut = null
let previousCall = null
let previousDifference = null
let dataPoints = []
let trendCount = 0
const currentTrend = null

// DOM elements
const putValueElement = document.getElementById("put-value")
const callValueElement = document.getElementById("call-value")
const resultsContainer = document.getElementById("results")
const countdownTimer = document.getElementById("countdown-timer")

// API configuration
const API_KEY = "LHg61JGS" // Your provided API key
const API_URL = "https://api.example.com/nifty50-oi" // Replace with the actual API endpoint
const UPDATE_INTERVAL = 60000 // 1 minute (adjust as needed)

// Load previous data if available
function loadHistory() {
  const storedData = localStorage.getItem(historyFile)
  if (storedData) {
    const history = JSON.parse(storedData)
    if (history && history.data) {
      const lastEntryTime = new Date(history.data[0].time)
      const currentTime = new Date()

      if (currentTime - lastEntryTime <= 24 * 60 * 60 * 1000) {
        dataPoints = history.data
        if (dataPoints.length > 0) {
          previousPut = dataPoints[0].put
          previousCall = dataPoints[0].call
          previousDifference = dataPoints[0].difference
        }
      } else {
        localStorage.removeItem(historyFile)
      }
    }
  }
}

// Save history to localStorage
function saveHistory() {
  localStorage.setItem(historyFile, JSON.stringify({ data: dataPoints }))
}

// Fetch Nifty 50 Open Interest data
async function fetchOIData() {
  try {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    })
    const data = await response.json()

    // Assuming the API returns data in the format { putOI: number, callOI: number }
    // Adjust this according to the actual response format of your API
    return {
      putValue: data.putOI,
      callValue: data.callOI,
    }
  } catch (error) {
    console.error("Error fetching OI data:", error)
    return null
  }
}

// Analyze data
function analyzeData(putValue, callValue) {
  const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const putChange = previousPut !== null ? putValue - previousPut : 0
  const callChange = previousCall !== null ? callValue - previousCall : 0

  const difference = putValue - callValue
  const differenceChange = previousDifference !== null ? difference - previousDifference : 0

  let signal = ""
  let weakness = ""
  if (callChange > putChange) {
    signal = "Bearish"
    weakness = putChange < 0 ? `Put is weaker by ${Math.abs(putChange)}` : `Call increased by ${callChange}`
  } else if (putChange > callChange) {
    signal = "Bullish"
    weakness = callChange < 0 ? `Call is weaker by ${Math.abs(callChange)}` : `Put increased by ${putChange}`
  }

  if (dataPoints.length >= 2) {
    const lastTwoSignals = dataPoints.slice(0, 2).map((d) => d.signal)
    if (lastTwoSignals.every((s) => s === signal)) {
      trendCount = 3
    } else {
      trendCount = 0
    }
  }

  const tradeSignal =
    trendCount < 3
      ? "No Trade (Waiting for trend confirmation)"
      : signal === "Bullish"
        ? "Call Buy / Put Sell"
        : "Put Buy / Call Sell"

  const newDataPoint = {
    time: currentTime,
    put: putValue,
    call: callValue,
    difference: difference,
    differenceChange: differenceChange,
    putChange: putChange,
    callChange: callChange,
    signal: signal,
    weakness: weakness,
    tradeSignal: tradeSignal,
  }

  dataPoints.unshift(newDataPoint)
  saveHistory()

  previousPut = putValue
  previousCall = callValue
  previousDifference = difference

  refreshResults()
}

// Refresh results display
function refreshResults() {
  resultsContainer.innerHTML = ""
  dataPoints.forEach((data, index) => {
    const diffChangeText =
      data.differenceChange !== 0 ? ` (${data.differenceChange > 0 ? "+" : ""}${data.differenceChange})` : ""

    const resultHTML = `
            <div class="result-item">
                <p><strong>${index + 1}. Time:</strong> ${data.time}</p>
                <p><strong>Put OI:</strong> ${data.put}, <strong>Call OI:</strong> ${data.call} (Difference: ${data.difference}${diffChangeText})</p>
                <p><strong>Put Change:</strong> ${data.putChange > 0 ? "+" : ""}${data.putChange}</p>
                <p><strong>Call Change:</strong> ${data.callChange > 0 ? "+" : ""}${data.callChange}</p>
                <p><strong>Signal:</strong> ${data.signal}</p>
                <p><strong>Weakness:</strong> ${data.weakness}</p>
                <p><strong>Trading Signal:</strong> ${data.tradeSignal}</p>
            </div>
        `
    resultsContainer.innerHTML += resultHTML
  })
}

// Update countdown timer
function updateCountdownTimer(remainingTime) {
  const minutes = Math.floor(remainingTime / 60000)
  const seconds = Math.floor((remainingTime % 60000) / 1000)
  countdownTimer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// Main function to fetch data and update the app
async function updateApp() {
  const data = await fetchOIData()
  if (data) {
    putValueElement.textContent = data.putValue
    callValueElement.textContent = data.callValue
    analyzeData(data.putValue, data.callValue)
  }

  let remainingTime = UPDATE_INTERVAL
  updateCountdownTimer(remainingTime)

  const timerInterval = setInterval(() => {
    remainingTime -= 1000
    updateCountdownTimer(remainingTime)

    if (remainingTime <= 0) {
      clearInterval(timerInterval)
      updateApp()
    }
  }, 1000)
}

// Initial load
loadHistory()
updateApp()

