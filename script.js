// add text before rendering the histogram
const addPlaceholderStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .histogram-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;  
      align-items: center;
      justify-content: center;
      padding: 1rem;
      padding-top: 4rem;     // Add this line to push text down
      text-align: center;
      color: #969696;
      font-size: 0.9rem;
    }
  `;
  document.head.appendChild(style);
};

const initializeHistogramPlaceholders = () => {
  const depthHistogram = document.getElementById('histogram-depth');
  const magnitudeHistogram = document.getElementById('histogram-magnitude');
  
  const placeholderHTML = `
    <div class="histogram-placeholder">
      <div><strong>💡 Ctrl + Mouse</strong> to select data points on the map</div>
      <div style="margin-top: 1rem;"> 💡 Press <strong>Shift</strong> to clear the selection</div>
    </div>
  `;
  
  depthHistogram.innerHTML = placeholderHTML;
  magnitudeHistogram.innerHTML = placeholderHTML;
};



var displaypoint = true
const readData = async () => {
  const rawdata = await d3.csv("GDMScatalog.csv")
  const mapped = rawdata.map((e) => ({enabled: false, data: e, marker: L.circle([e.lat, e.lon])}))
  return mapped
}

const renderDots = (data, map) => {
  data.map((e) => {
    map.removeLayer(e.marker)
    if(e.enabled && displaypoint) {
      e.marker.addTo(map)
    } 
  })
}
// render histogram
// D3 Histogram Function
// const renderHistogram = (inputdata, target, property, title, xAxisLabel, yAxisLabel) => {
const renderHistogram = (inputdata, target, property, xAxisLabel, yAxisLabel) => {
  // Set dimensions
  const margin = { top: 20, right: 30, bottom: 50, left: 80 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;
  d3.select(target).selectAll("*").remove()
  // Append SVG
  const svg = d3.select(target)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Extract property data
  const values = inputdata.map(d => d[property]).map(d => parseFloat(d));
  console.log("values: ", values)
  console.log("min: ", d3.min(values))
  console.log("max: ", d3.max(values))

  // Create x scale
  const x = d3.scaleLinear()
    .domain([d3.min(values), d3.max(values) + 1])
    .nice()
    .range([0, width]);

  // Create histogram bins
  let thresholds = null; // Default to 10 ticks
  if (values.length < 10) {
    thresholds = x.ticks(Math.max(1, values.length)); // At least 1 bin for small datasets
  } else {
    thresholds = x.ticks(10)
  }
  console.log("thresholds: ", thresholds)

  const bins = d3.histogram()
    .domain(x.domain())
    .thresholds(thresholds)(values);

  console.log("bins: ", bins)

  // Create y scale
  const y = d3.scaleLinear()
    //.domain([0, d3.max(bins, d => d.length)])
    .domain([0, d3.max(bins, d => d.length)])
    .range([height, 0]);

  // Append bars
  svg.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", d => x(d.x0))
    .attr("y", d => y(d.length))
    //.attr("width", d => x(d.x1) - x(d.x0) - 1)
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("height", d => height - y(d.length))
    .attr("fill", "steelblue");

  // Append x axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Append y axis
  svg.append("g").call(d3.axisLeft(y));

  // Append x-axis label
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 15) // Position below x-axis
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(xAxisLabel);

  // Append y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35) // Position beside y-axis
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(yAxisLabel);

  // Append title
  // svg.append("text")
  //  .attr("x", width / 2)
  //  .attr("y", height + margin.bottom - 10)
  //  .attr("text-anchor", "middle")
  //  .text(title);
}
const renderHeatmap = (inputdata, map, val) => {
  // heatmap
  const option_depth = {
      "scaleRadius": false,
      "radius": 10,
      "useLocalExtrema": false,
      latField: 'lat',
      lngField: 'lon',
      valueField: val,
      "maxOpacity": .5
  };
  const heatmapLayer = new HeatmapOverlay(option_depth);
  const mapdata = inputdata.map((e) => e.data)
  const ddata = {data: mapdata, length: mapdata.length}
  heatmapLayer.setData(ddata);
  heatmapLayer.addTo(map);

  return heatmapLayer
}

const main = async () => {

  // Add placeholder styles for histograms
  addPlaceholderStyles();
  initializeHistogramPlaceholders();

  // Initialize the map
  const map = L.map('map').setView([23, 120], 4);

  const rawdata = await readData()
  const data = rawdata.filter((e) => e.data.ML > 0)
  console.log(data)
  const allDate = data.map((e) => new Date(e.data.date))

  const earliestDate = new Date(Math.min.apply(null, allDate))
  const latestDate = new Date(Math.max.apply(null, allDate))
  console.log("earliest date: ", earliestDate)
  console.log("latest date: ", earliestDate)
  renderDots(data, map)

  var heatmap = renderHeatmap(data, map, "ML")

  // Add a tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // creating time slider
  const slider = document.getElementById('slider');
  noUiSlider.create(slider, {
    start: [earliestDate.getTime(), latestDate.getTime()], // Initial values for lower and upper handles
    connect: true,  // Show the range between handles
    range: {
      min: earliestDate.getTime(),
      max: latestDate.getTime()
    },
    step: 1  // Step size for sliding
  });
  // creating magnitude slider

  const magslider = document.getElementById('mag-slider');
  noUiSlider.create(magslider, {
    start: [6, 8], // Initial values for lower and upper handles
    orientation: 'vertical',
    direction: 'rtl',
    connect: true,  // Show the range between handles
    range: {
      min: 2,
      max: 8
    },
    step: 1  // Step size for sliding
  });

  const lowerValue = document.getElementById('lowerValue');
  const upperValue = document.getElementById('upperValue');
  const lowermag = document.getElementById('lowermag');
  const uppermag = document.getElementById('uppermag');
  var maxTime = 0;
  var minTime = 0;
  var maxMag = 7;
  var minMag = 10;

  const testEnabled = (e) => {
    if (new Date(e.data.date) > new Date(Math.round(maxTime)) || new Date(e.data.date) < new Date(Math.round(minTime))) 
      return false
    if (parseFloat(e.data.ML) > maxMag || parseFloat(e.data.ML) < minMag) 
      return false
    return true
  }

  // Update output values dynamically
  slider.noUiSlider.on('update', (values) => {
    maxTime = Math.round(values[1])
    minTime = Math.round(values[0])

    //lowerValue.textContent = Math.round(values[0]);
    //upperValue.textContent = Math.round(values[1]);
    lowerValue.textContent = new Date(Math.round(values[0])).toISOString().split('T')[0];;
    upperValue.textContent = new Date(Math.round(values[1])).toISOString().split('T')[0];;
    data.map((e) => {
      if (testEnabled(e)) e.enabled = true
      else e.enabled = false
    })
    renderDots(data, map)
    map.removeLayer(heatmap)
    heatmap = renderHeatmap(data.filter(e => e.enabled), map, "ML")
  });
  // Update output values dynamically
  magslider.noUiSlider.on('update', (values) => {
    maxMag = Math.round(values[1])
    minMag = Math.round(values[0])

    //lowerValue.textContent = Math.round(values[0]);
    //upperValue.textContent = Math.round(values[1]);
    //lowerValue.textContent = new Date(Math.round(values[0])).toISOString().split('T')[0];;
    //upperValue.textContent = new Date(Math.round(values[1])).toISOString().split('T')[0];;
    lowermag.textContent = minMag;;
    uppermag.textContent = maxMag;;
    data.map((e) => {
      if (testEnabled(e)) e.enabled = true
      else e.enabled = false
    })
    renderDots(data, map)
    map.removeLayer(heatmap)
    heatmap = renderHeatmap(data.filter(e => e.enabled), map, "ML")
  });

  //const depthHeatmap = renderHeatmap(data, map, "depth")

  // Rectangle selection
  let rectangle;
  let isCtrlPressed = false;

  // Listen for keydown and keyup to track Ctrl key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') isCtrlPressed = true;
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') isCtrlPressed = false;
    if (e.key === 'Shift') {
      if (rectangle) {
        map.removeLayer(rectangle)
        data.map((e) => {
          e.marker.setStyle({ color: 'blue' });
        })
      }
    }
  });


  // Enable selection only when Ctrl is pressed
  map.on('mousedown', (e) => {
    if (!isCtrlPressed) return;

    // Disable map dragging
    map.dragging.disable();

    if (rectangle) map.removeLayer(rectangle);

    const startPoint = e.latlng;
    let bounds = [startPoint, startPoint];
    rectangle = L.rectangle(bounds, { color: 'blue', weight: 1 }).addTo(map);

    map.on('mousemove', drawRectangle);
    map.once('mouseup', () => {
      map.off('mousemove', drawRectangle);

      // Find markers inside the rectangle
      const selectedMarkers = data.filter(e => {
        return rectangle.getBounds().contains(e.marker.getLatLng()) && e.enabled;
      });
      const notSelectedMarkers = data.filter(e => {
        return !(rectangle.getBounds().contains(e.marker.getLatLng()) && e.enabled);
      });

      console.log('Selected markers:', selectedMarkers.map(e => e.data.date));
      console.log('Selected data:', selectedMarkers);
      selectedMarkers.map((e) => {
        e.marker.setStyle({ color: 'red' });
      })
      notSelectedMarkers.map((e) => {
        e.marker.setStyle({ color: 'blue' });
      })


      // Render histograms for magnitude and depth
      const selectedData = selectedMarkers.map((e) => e.data)
      // renderHistogram(selectedData, "#histogram-magnitude", "ML", "Magnitude Histogram", "Magnitude", "Frequency");
      renderHistogram(selectedData, "#histogram-magnitude", "ML", "Magnitude", "Frequency");

      const selectedData2 = selectedMarkers.map((e) => e.data)
      // renderHistogram(selectedData2, "#histogram-depth", "depth", "Depth Histogram", "Depth(km)", "Frequency");
      renderHistogram(selectedData2, "#histogram-depth", "depth", "Depth(km)", "Frequency");

      //map.removeLayer(rectangle); // Remove rectangle after selection
      renderDots(data, map)

      // Re-enable map dragging
      map.dragging.enable();
    });

    function drawRectangle(e) {
      bounds[1] = e.latlng;
      rectangle.setBounds(bounds);
    }
  });
  // story mode toggle
  const playbtn = document.getElementById('playbtn');
  var playing = false
  const playback = setInterval(() => {
      if (maxTime >= latestDate.getTime()) {
        playing = false
        return;
      }
      if (!playing) return
      console.log(new Date(Math.round(minTime)).toISOString().split('T')[0])
      data.map((e) => {
        if (testEnabled(e)) e.enabled = true
        else e.enabled = false
      })
      renderDots(data, map)
      map.removeLayer(heatmap)
      //heatmap = renderHeatmap(data.filter(e => e.enabled), map, "ML")
      minTime+=1000 * 60 * 60 * 24 * 30;
      maxTime+=1000 * 60 * 60 * 24 * 30;
      const newconfig = {
        start: [minTime, maxTime], // Initial values for lower and upper handles
        connect: true,  // Show the range between handles
        range: {
          min: earliestDate.getTime(),
          max: latestDate.getTime()
        },
        step: 1  // Step size for sliding
      }
      slider.noUiSlider.updateOptions(newconfig)
    }, 5); // Update every 500ms
  playbtn.onclick = () => {
    if (!playing) {
      playing = true
      //map.removeLayer(rectangle)
      console.log("start")
      //minTime = earliestDate.getTime()
      maxTime = Math.max(minTime + 1000 * 60 * 60 * 24 * 30 * 12, maxTime)
    } else {
      playing = false
      console.log("pause")
    }
  }
  // point toggle 
  const toggle = document.getElementById('togglepnt');
  toggle.onclick = () => {
    if (displaypoint) {
      displaypoint = false
      renderDots(data, map)
    } else {
      displaypoint = true
      renderDots(data, map)
    }
  }
}

main()