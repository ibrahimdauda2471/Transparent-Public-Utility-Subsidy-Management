import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity contract functions
let mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockUsageRecords = new Map()
let mockElectricityThreshold = 500
let mockWaterThreshold = 15000
let mockGasThreshold = 100
let mockBlockHeight = 100

// Mock contract functions
const contractFunctions = {
  "is-admin": () => mockAdmin === "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "set-admin": (newAdmin) => {
    if (contractFunctions["is-admin"]()) {
      mockAdmin = newAdmin
      return { value: true }
    }
    return { error: 100 }
  },
  "record-usage": (recipient, period, electricity, water, gas) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    const key = `${recipient}-${period}`
    if (mockUsageRecords.has(key)) {
      return { error: 101 }
    }
    
    mockUsageRecords.set(key, {
      "electricity-usage": electricity,
      "water-usage": water,
      "gas-usage": gas,
      timestamp: mockBlockHeight,
    })
    
    return { value: true }
  },
  "update-usage": (recipient, period, electricity, water, gas) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    const key = `${recipient}-${period}`
    if (!mockUsageRecords.has(key)) {
      return { error: 102 }
    }
    
    mockUsageRecords.set(key, {
      "electricity-usage": electricity,
      "water-usage": water,
      "gas-usage": gas,
      timestamp: mockBlockHeight,
    })
    
    return { value: true }
  },
  "check-excessive-usage": (recipient, period) => {
    const key = `${recipient}-${period}`
    if (!mockUsageRecords.has(key)) {
      return { error: 102 }
    }
    
    const usage = mockUsageRecords.get(key)
    
    return {
      value: {
        "excessive-electricity": usage["electricity-usage"] > mockElectricityThreshold,
        "excessive-water": usage["water-usage"] > mockWaterThreshold,
        "excessive-gas": usage["gas-usage"] > mockGasThreshold,
      },
    }
  },
  "get-usage-record": (recipient, period) => {
    const key = `${recipient}-${period}`
    return mockUsageRecords.has(key) ? mockUsageRecords.get(key) : null
  },
  "update-thresholds": (newElectricityThreshold, newWaterThreshold, newGasThreshold) => {
    if (!contractFunctions["is-admin"]()) {
      return { error: 100 }
    }
    
    mockElectricityThreshold = newElectricityThreshold
    mockWaterThreshold = newWaterThreshold
    mockGasThreshold = newGasThreshold
    
    return { value: true }
  },
  "get-thresholds": () => {
    return {
      "electricity-threshold": mockElectricityThreshold,
      "water-threshold": mockWaterThreshold,
      "gas-threshold": mockGasThreshold,
    }
  },
}

describe("Usage Monitoring Contract", () => {
  beforeEach(() => {
    // Reset the mock state before each test
    mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    mockUsageRecords.clear()
    mockElectricityThreshold = 500
    mockWaterThreshold = 15000
    mockGasThreshold = 100
    mockBlockHeight = 100
  })
  
  it("should record usage data", () => {
    const result = contractFunctions["record-usage"](
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        202401,
        450,
        12000,
        80,
    )
    expect(result.value).toBe(true)
    
    const usage = contractFunctions["get-usage-record"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401)
    expect(usage).not.toBeNull()
    expect(usage["electricity-usage"]).toBe(450)
    expect(usage["water-usage"]).toBe(12000)
    expect(usage["gas-usage"]).toBe(80)
  })
  
  it("should not record duplicate usage data", () => {
    contractFunctions["record-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401, 450, 12000, 80)
    
    const result = contractFunctions["record-usage"](
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        202401,
        500,
        13000,
        90,
    )
    expect(result.error).toBe(101)
  })
  
  it("should update usage data", () => {
    contractFunctions["record-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401, 450, 12000, 80)
    
    const result = contractFunctions["update-usage"](
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        202401,
        500,
        13000,
        90,
    )
    expect(result.value).toBe(true)
    
    const usage = contractFunctions["get-usage-record"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401)
    expect(usage["electricity-usage"]).toBe(500)
    expect(usage["water-usage"]).toBe(13000)
    expect(usage["gas-usage"]).toBe(90)
  })
  
  it("should detect excessive usage correctly", () => {
    // Normal usage
    contractFunctions["record-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401, 450, 12000, 80)
    
    let result = contractFunctions["check-excessive-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401)
    expect(result.value["excessive-electricity"]).toBe(false)
    expect(result.value["excessive-water"]).toBe(false)
    expect(result.value["excessive-gas"]).toBe(false)
    
    // Excessive usage
    contractFunctions["record-usage"]("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8", 202401, 600, 16000, 120)
    
    result = contractFunctions["check-excessive-usage"]("ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3G8", 202401)
    expect(result.value["excessive-electricity"]).toBe(true)
    expect(result.value["excessive-water"]).toBe(true)
    expect(result.value["excessive-gas"]).toBe(true)
  })
  
  it("should update thresholds", () => {
    const result = contractFunctions["update-thresholds"](600, 20000, 150)
    expect(result.value).toBe(true)
    
    const thresholds = contractFunctions["get-thresholds"]()
    expect(thresholds["electricity-threshold"]).toBe(600)
    expect(thresholds["water-threshold"]).toBe(20000)
    expect(thresholds["gas-threshold"]).toBe(150)
    
    // Test with new thresholds
    contractFunctions["record-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401, 550, 18000, 130)
    
    const usage = contractFunctions["check-excessive-usage"]("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG", 202401)
    expect(usage.value["excessive-electricity"]).toBe(false) // Under new threshold
    expect(usage.value["excessive-water"]).toBe(false) // Under new threshold
    expect(usage.value["excessive-gas"]).toBe(false) // Under new threshold
  })
  
  it("should not update thresholds if not admin", () => {
    mockAdmin = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
    const result = contractFunctions["update-thresholds"](600, 20000, 150)
    expect(result.error).toBe(100)
    
    // Thresholds should remain unchanged
    const thresholds = contractFunctions["get-thresholds"]()
    expect(thresholds["electricity-threshold"]).toBe(500)
  })
})

