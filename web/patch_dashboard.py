import re

file_path = r"C:\laragon\www\LeakGuard-Monitoring-System\web\components\SingleTrafoDashboard.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace everything from "const handleMouseMove" down to "const handleExportCSV"
pattern = re.compile(r'(const handleMouseMove = \(e: any\) => \{.*?\n  })\n.*?(const handleExportCSV = \(\) => \{)', re.DOTALL)

replacement = r"""\1

  const handleMouseUp = () => {
    if (typeof refAreaStartIndex !== 'number' || typeof refAreaEndIndex !== 'number') {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      setRefAreaStartIndex(null)
      setRefAreaEndIndex(null)
      return
    }
    let start = refAreaStartIndex
    let end = refAreaEndIndex
    if (start > end) {
      [start, end] = [end, start]
    }
    if (end - start < 3) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      setRefAreaStartIndex(null)
      setRefAreaEndIndex(null)
      return
    }
    const absoluteStart = zoomRange ? zoomRange.start + start : start
    const absoluteEnd = zoomRange ? zoomRange.start + end : end
    
    // Ensure we don't go out of bounds (just in case)
    const validStart = Math.max(0, absoluteStart)
    const validEnd = Math.min(chartData.length - 1, absoluteEnd)

    setZoomRange({ start: validStart, end: validEnd })
    setRefAreaLeft(null)
    setRefAreaRight(null)
    setRefAreaStartIndex(null)
    setRefAreaEndIndex(null)
  }

  const handleZoomOut = () => {
    setZoomRange(null)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const scrollLeft = target.scrollLeft
    const scrollWidth = target.scrollWidth
    const clientWidth = target.clientWidth
    
    if (finalChartData.length === 0) return
    
    const totalItems = finalChartData.length
    const itemWidth = scrollWidth / totalItems
    
    const startIndex = Math.floor(scrollLeft / itemWidth)
    const endIndex = Math.min(totalItems - 1, Math.floor((scrollLeft + clientWidth) / itemWidth))
    
    const startItem = finalChartData[startIndex]
    const endItem = finalChartData[endIndex]
    
    if (startItem && endItem) {
      const cleanStartDate = startItem.date.replace(' (Pred)', '')
      const cleanEndDate = endItem.date.replace(' (Pred)', '')
      if (cleanStartDate !== cleanEndDate) {
        setDynamicDateRange(`${cleanStartDate} - ${cleanEndDate}`)
      } else {
        setDynamicDateRange(cleanStartDate)
      }
    }
  }

  // Label rentang zoom ala Steam Market
  let zoomLabel = ''
  if (zoomRange && chartData[zoomRange.start] && chartData[zoomRange.end]) {
    const sData = chartData[zoomRange.start]
    const eData = chartData[zoomRange.end]
    const sTime = sData.time.replace(' (Pred)', '')
    const eTime = eData.time.replace(' (Pred)', '')
    zoomLabel = `${sTime} - ${eTime}`
  }

  \2"""

new_content = pattern.sub(replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("File patched successfully!")
