import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Main application class for the Stack Configurator.
 * This class encapsulates all the state, DOM elements, and logic
 * for the building configuration tool.
 */
class StackConfigApp {
    constructor() {
        this.initializeConstants();
        this.initializeState();
        this.cacheDOMElements();
        this.bindEventListeners();
        this.init();
    }

    /**
     * Sets up all the hardcoded constants and configuration values.
     */
    initializeConstants() {
        this.CONSTANTS = {
            M_TO_FT: 3.28084,
            SQM_TO_SQFT: 10.7639,
            METRIC_FLOOR_HEIGHTS: [3.175, 3.479, 3.784],
            MODULE_WIDTH_METRIC: 3.7846, // 12' 5"
            STAIR_WIDTH_METRIC: 3.048,   // 10' 0"
            STAIR_DEPTH_METRIC: 7.62,    // 25' 0"
            MAX_HEIGHT_METRIC: 40, // Increased max height
            SOUTH_DEPTH_METRIC: 11.0998, // This is the longer side
            NORTH_DEPTH_METRIC: 9.4488,
            SUITE_TYPES: {
                'studio': { id: 'studio', name: 'Studio', moduleCount: 1, color: '#006F37', codes: { noCorridor: 'U01', corridor: 'U02'} },
                'one-bed': { id: 'one-bed', name: '1 Bedroom', moduleCount: 2, color: '#ABD268', codes: { noCorridor: 'U03+U07', corridor: 'U05+U08'} },
                'two-bed': { id: 'two-bed', name: '2 Bedroom', moduleCount: 3, color: '#69BA7F', codes: { noCorridor: 'U04+U07+U09', corridor: 'U06+U08+U10'} },
                'three-bed': { id: 'three-bed', name: '3 Bedroom', moduleCount: 4, color: '#D0FFDD', codes: { noCorridor: 'U07+U09+U11+U13', corridor: 'U08+U10+U12+U14'} }
            },
            STAIR_INFO: { id: 'stair', name: 'Stair', color: '#FFC885', codes: { noCorridor: 'U18', corridor: 'U18' } },
            ELEVATOR_INFO: { id: 'elevator', name: 'Elevator', moduleCount: 1, color: '#FF7518', codes: { noCorridor: 'N/A', corridor: 'U16' } }
        };
    }

    /**
     * Initializes the dynamic state of the application.
     */
    initializeState() {
        this.state = {
            is3DView: false,
            threeInitialized: false,
            isPanning: false,
            startPoint2D: { x: 0, y: 0 },
            svgViewBox: { x: 166.67, y: 166.67, w: 166.67, h: 166.67 },
            currentUnit: 'imperial',
            buildingLayout: [],
            currentFloor2D: 0,
            showDimensions: true,
            projectData: {
                width: 13 * this.CONSTANTS.MODULE_WIDTH_METRIC,
                depth: this.CONSTANTS.SOUTH_DEPTH_METRIC + this.CONSTANTS.NORTH_DEPTH_METRIC,
                height: 10,
                floorHeight: 3.175,
                includeStairs: true
            }
        };

        // 3D scene variables
        this.three = {
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            dimGroup: null,
            floorLinesGroup: null,
            moduleGroup: null
        };
    }

    /**
     * Caches references to all necessary DOM elements for performance.
     */
    cacheDOMElements() {
        const get = (id) => document.getElementById(id);
        this.dom = {
            // Main containers
            planViewContainer: get('plan-view'),
            threeViewContainer: get('three-view'),
            threeCanvas: get('three-canvas'),
            planModuleGroup: get('plan-module-group'),
            floorThumbnailsContainer: get('floor-thumbnails'),

            // Buttons
            viewToggleButton: get('view-toggle-btn'),
            unitToggleButton: get('unit-toggle-btn'),
            resetViewBtn: get('reset-view-btn'),
            confirmSuiteMixBtn: get('confirm-suite-mix'),
            seeDetailBtn: get('see-detail-btn'),
            closeModalBtn: get('close-modal-btn'),

            // Inputs & Controls
            widthSlider: get('width-slider'),
            depthSlider: get('depth-slider'),
            heightSlider: get('height-slider'),
            widthInput: get('width-input'),
            depthInput: get('depth-input'),
            heightInput: get('height-input'),
            floorHeightSelect: get('floor-height-select'),
            stairsToggle: get('stairs-toggle'),
            dimensionsToggle: get('dimensions-toggle'),
            suiteSliders: Array.from(document.querySelectorAll('.suite-slider')),
            suiteInputs: Array.from(document.querySelectorAll('.suite-input')),

            // Display spans & units
            widthUnit: get('width-unit'),
            depthUnit: get('depth-unit'),
            heightUnit: get('height-unit'),
            floorCountSpan: get('floor-count'),
            totalAreaSpan: get('total-area'),
            footprintAreaSpan: get('footprint-area'),
            modulesPerFloorSpan: get('modules-per-floor'),
            totalModulesSpan: get('total-modules'),
            suiteTotalPercentage: get('suite-total-percentage'),

            // 2D SVG Elements
            svg: get('plan-svg'),
            leftStairPlan: get('left-stair-plan'),
            rightStairPlan: get('right-stair-plan'),
            dim2DElements: Array.from(document.querySelectorAll('.dim-element')),

            // Summary & Modal
            summarySection: get('summary-section'),
            summaryTableBody: get('summary-table-body'),
            detailModal: get('detail-modal'),
            detailSummaryTableBody: get('detail-summary-table-body'),
            
            // Chart
            chartCanvas: get('suite-mix-chart'),
        };
    }

    /**
     * Attaches all event listeners to the DOM elements.
     */
    bindEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        // --- Control Panel Listeners ---
        this.dom.unitToggleButton.addEventListener('click', () => this.toggleUnits());
        this.dom.stairsToggle.addEventListener('change', (e) => this.handleStairsToggle(e.target.checked));
        this.dom.dimensionsToggle.addEventListener('change', (e) => this.handleDimensionsToggle(e.target.checked));
        this.dom.viewToggleButton.addEventListener('click', () => this.toggleView());
        
        // Project dimension inputs
        this.dom.widthSlider.addEventListener('input', (e) => this.handleDimensionChange('width', e.target.value));
        this.dom.widthInput.addEventListener('change', (e) => this.handleDimensionChange('width', e.target.value));
        this.dom.heightSlider.addEventListener('input', (e) => this.handleDimensionChange('height', e.target.value));
        this.dom.heightInput.addEventListener('change', (e) => this.handleDimensionChange('height', e.target.value));
        this.dom.floorHeightSelect.addEventListener('change', (e) => this.handleFloorHeightChange(e.target.value));

        // Suite mix inputs
        this.dom.suiteInputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                this.dom.suiteSliders[index].value = input.value;
                this.validateSuiteMix();
            });
        });
        this.dom.suiteSliders.forEach((slider, index) => {
            slider.addEventListener('input', () => {
                this.dom.suiteInputs[index].value = slider.value;
                this.validateSuiteMix();
            });
        });
        this.dom.confirmSuiteMixBtn.addEventListener('click', () => this.runPlacementAlgorithm());

        // --- Viewport Listeners ---
        this.dom.resetViewBtn.addEventListener('click', () => this.resetView());
        
        // 2D pan and zoom
        this.dom.planViewContainer.addEventListener('wheel', (e) => this.handle2DZoom(e));
        this.dom.planViewContainer.addEventListener('mousedown', (e) => this.start2DPan(e));
        this.dom.planViewContainer.addEventListener('mousemove', (e) => this.pan2D(e));
        this.dom.planViewContainer.addEventListener('mouseup', () => this.end2DPan());
        this.dom.planViewContainer.addEventListener('mouseleave', () => this.end2DPan());

        // --- Modal Listeners ---
        this.dom.seeDetailBtn.addEventListener('click', () => this.dom.detailModal.classList.remove('hidden'));
        this.dom.closeModalBtn.addEventListener('click', () => this.dom.detailModal.classList.add('hidden'));
        this.dom.detailModal.addEventListener('click', (e) => {
            if (e.target === this.dom.detailModal) {
                this.dom.detailModal.classList.add('hidden');
            }
        });
    }

    /**
     * Initial setup call.
     */
    init() {
        this.updateUnitSettings();
        this.createChart();
        this.validateSuiteMix();
        this.setSVGViewBox(); // Ensure initial zoom is applied
    }

    // --- EVENT HANDLERS ---

    toggleUnits() {
        this.state.currentUnit = this.state.currentUnit === 'metric' ? 'imperial' : 'metric';
        this.updateUnitSettings();
    }

    handleStairsToggle(isChecked) {
        this.state.projectData.includeStairs = isChecked;
        this.updateViews();
    }

    handleDimensionsToggle(isChecked) {
        this.state.showDimensions = isChecked;
        this.redrawViews();
    }

    handleDimensionChange(key, value) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;
        
        const metricValue = this.state.currentUnit === 'metric' ? numValue : this.convert(numValue, 'metric');
        this.state.projectData[key] = metricValue;
        
        this.updateViews();
    }

    handleFloorHeightChange(value) {
        this.state.projectData.floorHeight = parseFloat(value);
        
        const numFloors = Math.max(1, Math.round(this.state.projectData.height / this.state.projectData.floorHeight));
        this.state.projectData.height = numFloors * this.state.projectData.floorHeight;
        
        this.updateUnitSettings();
    }
    
    toggleView() {
        this.state.is3DView = !this.state.is3DView;
        
        this.dom.planViewContainer.classList.toggle('hidden', this.state.is3DView);
        this.dom.threeViewContainer.classList.toggle('hidden', !this.state.is3DView);
        this.dom.viewToggleButton.textContent = this.state.is3DView ? 'Switch to 2D Plan' : 'Switch to 3D View';
        
        const showThumbnails = !this.state.is3DView && this.state.buildingLayout.length > 0;
        this.dom.floorThumbnailsContainer.classList.toggle('hidden', !showThumbnails);

        if (this.state.is3DView && !this.state.threeInitialized) {
            setTimeout(() => this.initThree(), 0);
        }
        
        if (this.state.threeInitialized) {
            this.three.dimGroup.visible = this.state.is3DView && this.state.showDimensions;
            this.three.floorLinesGroup.visible = this.state.is3DView;
        }
    }

    resetView() {
        if (this.state.is3DView && this.three.controls) {
            this.three.controls.reset();
        } else {
            // Reset to the default zoomed-in state
            this.state.svgViewBox = { x: 166.67, y: 166.67, w: 166.67, h: 166.67 };
            this.setSVGViewBox();
        }
    }

    onWindowResize() {
        if (!this.state.threeInitialized) return;
        this.three.camera.aspect = this.dom.threeViewContainer.clientWidth / this.dom.threeViewContainer.clientHeight;
        this.three.camera.updateProjectionMatrix();
        this.three.renderer.setSize(this.dom.threeViewContainer.clientWidth, this.dom.threeViewContainer.clientHeight);
    }

    // --- 2D VIEW HANDLERS ---
    
    handle2DZoom(event) {
        event.preventDefault();
        const zoomFactor = 1.1;
        const viewBox = this.state.svgViewBox;
        const rect = this.dom.svg.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const svgX = viewBox.x + (mouseX / rect.width) * viewBox.w;
        const svgY = viewBox.y + (mouseY / rect.height) * viewBox.h;

        if (event.deltaY < 0) { // Zoom in
            viewBox.w /= zoomFactor;
            viewBox.h /= zoomFactor;
        } else { // Zoom out
            viewBox.w *= zoomFactor;
            viewBox.h *= zoomFactor;
        }

        viewBox.x = svgX - (mouseX / rect.width) * viewBox.w;
        viewBox.y = svgY - (mouseY / rect.height) * viewBox.h;
        
        this.setSVGViewBox();
    }
    
    start2DPan(event) {
        this.state.isPanning = true;
        this.state.startPoint2D = { x: event.clientX, y: event.clientY };
    }

    pan2D(event) {
        if (!this.state.isPanning) return;
        const endPoint = { x: event.clientX, y: event.clientY };
        const dx = (this.state.startPoint2D.x - endPoint.x) * (this.state.svgViewBox.w / this.dom.planViewContainer.clientWidth);
        const dy = (this.state.startPoint2D.y - endPoint.y) * (this.state.svgViewBox.h / this.dom.planViewContainer.clientHeight);
        this.state.svgViewBox.x += dx;
        this.state.svgViewBox.y += dy;
        this.state.startPoint2D = endPoint;
        this.setSVGViewBox();
    }

    end2DPan() {
        this.state.isPanning = false;
    }

    setSVGViewBox() {
        const { x, y, w, h } = this.state.svgViewBox;
        this.dom.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    }


    // --- CORE LOGIC & ALGORITHMS ---

    runPlacementAlgorithm() {
        if (!this.state.threeInitialized) {
            this.dom.threeViewContainer.classList.remove('hidden');
            this.initThree();
            if (!this.state.is3DView) {
                this.dom.threeViewContainer.classList.add('hidden');
            }
        }

        const singleSideModules = Math.max(1, Math.round(this.state.projectData.width / this.CONSTANTS.MODULE_WIDTH_METRIC));
        const numFloors = Math.max(1, Math.round(this.state.projectData.height / this.state.projectData.floorHeight));
        
        const totalResidentialModules = (singleSideModules * 2 * numFloors) - numFloors;

        const percentages = this.dom.suiteInputs.reduce((acc, input) => {
            acc[input.dataset.suiteId] = parseFloat(input.value) || 0;
            return acc;
        }, {});

        const suiteOrder = ['three-bed', 'two-bed', 'one-bed', 'studio'];
        let targetSuiteCounts = {};
        let usedModules = 0;

        for (const typeId of suiteOrder) {
            const suiteInfo = this.CONSTANTS.SUITE_TYPES[typeId];
            const targetModules = totalResidentialModules * (percentages[typeId] / 100);
            const numSuites = Math.floor(targetModules / suiteInfo.moduleCount); // Use floor to not over-allocate
            targetSuiteCounts[typeId] = numSuites;
            usedModules += numSuites * suiteInfo.moduleCount;
        }
        
        let allSuitesToPlace = [];
        for (const typeId of suiteOrder) {
            const suiteInfo = this.CONSTANTS.SUITE_TYPES[typeId];
            for (let i = 0; i < targetSuiteCounts[typeId]; i++) {
                allSuitesToPlace.push({ ...suiteInfo });
            }
        }
        
        this.generateBuildingLayout(allSuitesToPlace, numFloors, singleSideModules);
        this.updateSummaryAndUI(percentages);
    }
    
    generateBuildingLayout(allSuitesToPlace, numFloors, singleSideModules) {
        let floorSuiteLists = Array.from({ length: numFloors }, () => []);
        let floorCapacity = Array(numFloors).fill(singleSideModules * 2 - 1);

        allSuitesToPlace.sort((a, b) => b.moduleCount - a.moduleCount);

        allSuitesToPlace.forEach(suite => {
            let placed = false;
            for (let i = 0; i < numFloors; i++) {
                if (floorCapacity[i] >= suite.moduleCount) {
                    floorSuiteLists[i].push(suite);
                    floorCapacity[i] -= suite.moduleCount;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const targetFloor = floorCapacity.findIndex(c => c > 0);
                if (targetFloor !== -1) {
                    floorSuiteLists[targetFloor].push(suite);
                    floorCapacity[targetFloor] -= suite.moduleCount;
                }
            }
        });

        for (let i = 0; i < numFloors; i++) {
            while (floorCapacity[i] > 0) {
                if (floorCapacity[i] >= 4) {
                    floorSuiteLists[i].push({ ...this.CONSTANTS.SUITE_TYPES['three-bed'] });
                    floorCapacity[i] -= 4;
                } else if (floorCapacity[i] >= 3) {
                    floorSuiteLists[i].push({ ...this.CONSTANTS.SUITE_TYPES['two-bed'] });
                    floorCapacity[i] -= 3;
                } else if (floorCapacity[i] >= 2) {
                    floorSuiteLists[i].push({ ...this.CONSTANTS.SUITE_TYPES['one-bed'] });
                    floorCapacity[i] -= 2;
                } else if (floorCapacity[i] >= 1) {
                    floorSuiteLists[i].push({ ...this.CONSTANTS.SUITE_TYPES['studio'] });
                    floorCapacity[i] -= 1;
                }
            }
        }

        let unsortedLayout = floorSuiteLists.map(suiteList => {
            const plan = this.createFloorPlan(suiteList, singleSideModules);
            const score = suiteList.reduce((acc, s) => acc + s.moduleCount, 0);
            return { plan, score };
        });

        unsortedLayout.sort((a, b) => a.score - b.score);
        
        this.state.buildingLayout = unsortedLayout.map(item => item.plan);
    }

    createFloorPlan(suites, singleSideModules) {
        let plan = { north: Array(singleSideModules).fill(null), south: Array(singleSideModules).fill(null) };
        const middleIndex = Math.floor(singleSideModules / 2);
        
        plan.south[middleIndex] = { ...this.CONSTANTS.ELEVATOR_INFO, instanceId: 'elevator-core', isCorridorSide: false };

        const placeSuite = (suite, index, row) => {
            const instanceId = `${suite.id}-${Math.random()}`;
            const isCorridorSide = row === 'north';
            for (let i = 0; i < suite.moduleCount; i++) {
                plan[row][index + i] = { ...suite, instanceId, isCorridorSide };
            }
        };

        let largeSuites = suites.filter(s => s.moduleCount > 1).sort((a, b) => b.moduleCount - a.moduleCount);
        let smallSuites = suites.filter(s => s.moduleCount === 1);

        let pointers = {
            north: { left: 0, right: singleSideModules - 1 },
            south: { left: 0, right: singleSideModules - 1 }
        };

        // Place large suites from the outside-in
        while (largeSuites.length > 0) {
            const suite = largeSuites.shift();
            
            let bestSpot = { row: null, side: null, gap: -1 };

            const checkSpot = (row, side) => {
                const p = pointers[row];
                if (p.left <= p.right && plan[row][side === 'left' ? p.left : p.right] === null) {
                    const gap = p.right - p.left + 1;
                    if (gap >= suite.moduleCount && gap > bestSpot.gap) {
                        bestSpot = { row, side, gap };
                    }
                }
            };
            
            checkSpot('north', 'left');
            checkSpot('south', 'left');
            checkSpot('north', 'right');
            checkSpot('south', 'right');
            
            if (bestSpot.row) {
                if (bestSpot.side === 'left') {
                    placeSuite(suite, pointers[bestSpot.row].left, bestSpot.row);
                    pointers[bestSpot.row].left += suite.moduleCount;
                } else { // right
                    placeSuite(suite, pointers[bestSpot.row].right - suite.moduleCount + 1, bestSpot.row);
                    pointers[bestSpot.row].right -= suite.moduleCount;
                }
            } else {
                smallSuites.push(suite); 
            }
        }
        
        const remainingSuites = smallSuites.sort((a,b) => b.moduleCount - a.moduleCount);
        ['north', 'south'].forEach(row => {
            for (let i = 0; i < singleSideModules; i++) {
                if (plan[row][i] === null) {
                    const suiteIndex = remainingSuites.findIndex(s => {
                        if (i + s.moduleCount > singleSideModules) return false;
                        for (let j = 0; j < s.moduleCount; j++) {
                            if (plan[row][i+j] !== null) return false;
                        }
                        return true;
                    });

                    if (suiteIndex !== -1) {
                        const suiteToPlace = remainingSuites.splice(suiteIndex, 1)[0];
                        placeSuite(suiteToPlace, i, row);
                        i += suiteToPlace.moduleCount - 1;
                    }
                }
            }
        });

        return plan;
    }

    updateSummaryAndUI(desiredPercentages) {
        const summary = {};
        let totalPlacedSuites = 0;
        
        this.state.buildingLayout.forEach(floor => {
            Object.values(floor).flat().forEach(module => {
                if (module && module.id !== 'elevator' && module.id !== 'stair') {
                    if (!summary[module.id]) {
                        summary[module.id] = { 
                            ...this.CONSTANTS.SUITE_TYPES[module.id], 
                            count: 0, 
                            moduleTotal: 0, 
                            instances: new Set(), 
                            totalArea: 0, 
                            desiredPercentage: desiredPercentages[module.id] 
                        };
                    }
                    summary[module.id].instances.add(module.instanceId);
                    summary[module.id].moduleTotal++;
                    const moduleDepth = module.isCorridorSide ? this.CONSTANTS.NORTH_DEPTH_METRIC : this.CONSTANTS.SOUTH_DEPTH_METRIC;
                    summary[module.id].totalArea += this.CONSTANTS.MODULE_WIDTH_METRIC * moduleDepth;
                }
            });
        });

        for(const id in summary) {
            summary[id].count = summary[id].instances.size;
            totalPlacedSuites += summary[id].count;
        }

        const actualSuiteCounts = Object.values(this.CONSTANTS.SUITE_TYPES).map(suiteType => {
            return summary[suiteType.id] ? summary[suiteType.id].count : 0;
        });
        this.suiteMixChart.data.datasets[0].data = actualSuiteCounts;
        this.suiteMixChart.update();
        
        this.updateSummaryTable(summary, totalPlacedSuites);
        this.populateDetailedSummary(summary, totalPlacedSuites);
        
        this.generateFloorThumbnails();
        this.state.currentFloor2D = 0;
        this.redrawViews();
    }


    // --- UI & VIEW UPDATE FUNCTIONS ---

    updateViews() {
        const { projectData, currentUnit } = this.state;
        const { MODULE_WIDTH_METRIC, SOUTH_DEPTH_METRIC, NORTH_DEPTH_METRIC, STAIR_WIDTH_METRIC, STAIR_DEPTH_METRIC } = this.CONSTANTS;

        const singleSideModules = Math.max(1, Math.round(projectData.width / MODULE_WIDTH_METRIC));
        const numFloors = Math.max(1, Math.round(projectData.height / projectData.floorHeight));
        
        const actualWidth = singleSideModules * MODULE_WIDTH_METRIC;
        const actualDepth = SOUTH_DEPTH_METRIC + NORTH_DEPTH_METRIC;
        const actualHeight = numFloors * projectData.floorHeight;
        
        let footprintArea = actualWidth * actualDepth;
        if (projectData.includeStairs) {
            footprintArea += 2 * (STAIR_WIDTH_METRIC * STAIR_DEPTH_METRIC);
        }
        const totalArea = footprintArea * numFloors;

        // FIXED: Correctly display values based on the current unit without re-converting
        const displayWidth = currentUnit === 'metric' ? actualWidth : this.convert(actualWidth, 'imperial');
        const displayDepth = currentUnit === 'metric' ? actualDepth : this.convert(actualDepth, 'imperial');
        const displayHeight = currentUnit === 'metric' ? actualHeight : this.convert(actualHeight, 'imperial');
        const displayFootprint = currentUnit === 'metric' ? footprintArea : this.convert(footprintArea, 'imperial', true);
        const displayTotalArea = currentUnit === 'metric' ? totalArea : this.convert(totalArea, 'imperial', true);
        const areaUnit = currentUnit === 'metric' ? 'm²' : 'ft²';

        this.dom.widthInput.value = displayWidth.toFixed(1);
        this.dom.widthSlider.value = displayWidth;
        this.dom.depthInput.value = displayDepth.toFixed(1);
        this.dom.depthSlider.value = displayDepth;
        this.dom.heightInput.value = displayHeight.toFixed(1);
        this.dom.heightSlider.value = displayHeight;
        
        this.dom.floorCountSpan.textContent = numFloors;
        this.dom.modulesPerFloorSpan.textContent = singleSideModules * 2;
        this.dom.totalModulesSpan.textContent = singleSideModules * 2 * numFloors;
        this.dom.footprintAreaSpan.textContent = `${displayFootprint.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}`;
        this.dom.totalAreaSpan.textContent = `${displayTotalArea.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}`;
        
        this.state.buildingLayout = [];
        this.dom.summarySection.classList.add('hidden');
        this.dom.floorThumbnailsContainer.classList.add('hidden');
        
        this.redrawViews();
    }

    redrawViews() {
        const { projectData } = this.state;
        const { MODULE_WIDTH_METRIC, SOUTH_DEPTH_METRIC, NORTH_DEPTH_METRIC } = this.CONSTANTS;
        const singleSideModules = Math.max(1, Math.round(projectData.width / MODULE_WIDTH_METRIC));
        const numFloors = Math.max(1, Math.round(projectData.height / projectData.floorHeight));
        
        const width = singleSideModules * MODULE_WIDTH_METRIC;
        const depth = SOUTH_DEPTH_METRIC + NORTH_DEPTH_METRIC;
        const height = numFloors * projectData.floorHeight;

        this.redraw2DPlan(width, depth, SOUTH_DEPTH_METRIC, NORTH_DEPTH_METRIC, singleSideModules, projectData.includeStairs);
        if (this.state.threeInitialized) {
            this.redraw3DView(width, height, depth, SOUTH_DEPTH_METRIC, NORTH_DEPTH_METRIC, projectData.floorHeight, numFloors, singleSideModules, projectData.includeStairs);
        }
    }

    redraw2DPlan(width, depth, southDepth, northDepth, singleSideModules, includeStairs) {
        const scaleFactor = 2.2;
        const planWidth = width * scaleFactor;
        const southPlanHeight = southDepth * scaleFactor;
        const northPlanHeight = northDepth * scaleFactor;
        const totalPlanHeight = depth * scaleFactor;
        const modulePlanWidth = this.CONSTANTS.MODULE_WIDTH_METRIC * scaleFactor;
        
        const totalVisualWidth = includeStairs ? width + 2 * this.CONSTANTS.STAIR_WIDTH_METRIC : width;
        const totalVisualPlanWidth = totalVisualWidth * scaleFactor;
        
        const svgWidth = 500, svgHeight = 500;
        const x = (svgWidth - totalVisualPlanWidth) / 2;
        const y = (svgHeight - totalPlanHeight) / 2;
        const mainBuildingX = x + (includeStairs ? this.CONSTANTS.STAIR_WIDTH_METRIC * scaleFactor : 0);

        this.dom.planModuleGroup.innerHTML = '';
        
        const floorToShow = this.state.buildingLayout[this.state.currentFloor2D];
        const placeholderColor = '#d1d5db';
        const lineColor = '#6b7280';
        
        if (this.state.buildingLayout.length > 0) {
            document.querySelectorAll('.floor-thumbnail').forEach((thumb, index) => {
                thumb.classList.toggle('thumbnail-active', index === this.state.currentFloor2D);
            });
        }

        ['south', 'north'].forEach(row => {
            const rowY = row === 'south' ? y : y + southPlanHeight;
            const rowHeight = row === 'south' ? southPlanHeight : northPlanHeight;
            for (let i = 0; i < singleSideModules; i++) {
                const module = floorToShow ? floorToShow[row][i] : null;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', mainBuildingX + i * modulePlanWidth);
                rect.setAttribute('y', rowY);
                rect.setAttribute('width', modulePlanWidth);
                rect.setAttribute('height', rowHeight);
                rect.setAttribute('fill', module ? module.color : placeholderColor);
                rect.setAttribute('stroke', lineColor);
                rect.setAttribute('stroke-width', 0.2);
                this.dom.planModuleGroup.appendChild(rect);
            }
        });
        
        const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        centerLine.setAttribute('x1', mainBuildingX);
        centerLine.setAttribute('y1', y + southPlanHeight);
        centerLine.setAttribute('x2', mainBuildingX + planWidth);
        centerLine.setAttribute('y2', y + southPlanHeight);
        centerLine.setAttribute('stroke', lineColor);
        centerLine.setAttribute('stroke-width', 0.2);
        this.dom.planModuleGroup.appendChild(centerLine);

        this.update2DStairs(includeStairs, x, y, planWidth, totalPlanHeight, scaleFactor);
        this.update2DDimensions(x, y, totalVisualPlanWidth, totalPlanHeight, totalVisualWidth, depth, southDepth, northDepth);
    }

    redraw3DView(width, height, depth, southDepth, northDepth, floorHeight, numFloors, singleSideModules, includeStairs) {
        while(this.three.moduleGroup.children.length > 0){ 
            this.three.moduleGroup.remove(this.three.moduleGroup.children[0]); 
        }
        
        const moduleGeo = new THREE.BoxGeometry(this.CONSTANTS.MODULE_WIDTH_METRIC, floorHeight, 1);
        const placeholderMat = new THREE.MeshLambertMaterial({ color: 0xd1d5db, transparent: true, opacity: 0.5 });
        const lineMat = new THREE.LineBasicMaterial({ color: 0x6b7280 });

        for (let floorIndex = 0; floorIndex < numFloors; floorIndex++) {
            const y = floorIndex * floorHeight + floorHeight / 2;
            const floorLayout = this.state.buildingLayout[floorIndex];
            
            for (let i = 0; i < singleSideModules; i++) {
                // South side modules
                const moduleSouth = floorLayout ? floorLayout.south[i] : null;
                const matSouth = moduleSouth ? new THREE.MeshLambertMaterial({ color: moduleSouth.color }) : placeholderMat;
                const meshSouth = new THREE.Mesh(moduleGeo, matSouth);
                meshSouth.scale.z = southDepth;
                meshSouth.position.set(-width / 2 + i * this.CONSTANTS.MODULE_WIDTH_METRIC + this.CONSTANTS.MODULE_WIDTH_METRIC / 2, y, -(depth / 2 - southDepth / 2));
                this.three.moduleGroup.add(meshSouth);
                
                // North side modules
                const moduleNorth = floorLayout ? floorLayout.north[i] : null;
                const matNorth = moduleNorth ? new THREE.MeshLambertMaterial({ color: moduleNorth.color }) : placeholderMat;
                const meshNorth = new THREE.Mesh(moduleGeo, matNorth);
                meshNorth.scale.z = northDepth;
                meshNorth.position.set(-width / 2 + i * this.CONSTANTS.MODULE_WIDTH_METRIC + this.CONSTANTS.MODULE_WIDTH_METRIC / 2, y, (depth / 2 - northDepth / 2));
                this.three.moduleGroup.add(meshNorth);
            }
        }
        
        // ADDED: Create the standalone elevator overrun at the top
        if (this.state.buildingLayout.length > 0) {
            const { ELEVATOR_INFO, MODULE_WIDTH_METRIC, SOUTH_DEPTH_METRIC } = this.CONSTANTS;
            const middleIndex = Math.floor(singleSideModules / 2);

            // Use the same base geometry as other modules for consistency
            const elevatorOverrunGeo = new THREE.BoxGeometry(MODULE_WIDTH_METRIC, floorHeight, 1);
            const elevatorOverrunMat = new THREE.MeshLambertMaterial({ color: ELEVATOR_INFO.color });
            const elevatorOverrunMesh = new THREE.Mesh(elevatorOverrunGeo, elevatorOverrunMat);

            // Scale it just like the other south-side modules
            elevatorOverrunMesh.scale.z = SOUTH_DEPTH_METRIC;

            // Calculate position for the overrun module
            const xPos = -width / 2 + middleIndex * MODULE_WIDTH_METRIC + MODULE_WIDTH_METRIC / 2;
            const yPos = height + (floorHeight / 2); // Place it centered on top of the main building height
            const zPos = -(depth / 2 - SOUTH_DEPTH_METRIC / 2);

            elevatorOverrunMesh.position.set(xPos, yPos, zPos);
            this.three.moduleGroup.add(elevatorOverrunMesh);
        }

        this.three.moduleGroup.children.forEach(mesh => {
            if(mesh instanceof THREE.Mesh){
                const edges = new THREE.EdgesGeometry(mesh.geometry);
                const line = new THREE.LineSegments(edges, lineMat);
                line.scale.copy(mesh.scale);
                line.position.copy(mesh.position);
                this.three.moduleGroup.add(line);
            }
        });

        this.update3DStairs(includeStairs, width, height);
        this.update3DDimensions(width, height, depth, southDepth, northDepth, includeStairs);
        this.update3DFloorLines(width, depth, height, floorHeight, numFloors, includeStairs);
    }
    
    // --- UI HELPER FUNCTIONS ---
    
    updateSummaryTable(summary, totalSuites) {
        this.dom.summaryTableBody.innerHTML = '';
        if (Object.keys(summary).length === 0 && this.state.buildingLayout.length === 0) {
            this.dom.summarySection.classList.add('hidden');
            return;
        }

        const sortedSummary = Object.values(summary).sort((a,b) => a.moduleCount - b.moduleCount);
        for (const suite of sortedSummary) {
            const percentage = totalSuites > 0 ? ((suite.count / totalSuites) * 100).toFixed(1) : 0;
            const row = `
                <tr class="border-t">
                    <td class="p-1 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${suite.color};"></div>${suite.name}</td>
                    <td class="p-1 text-right">${suite.count}</td>
                    <td class="p-1 text-right">${percentage}%</td>
                </tr>
            `;
            this.dom.summaryTableBody.innerHTML += row;
        }

        // Add Elevator and Stair info
        if (this.state.buildingLayout.length > 0) {
            const { ELEVATOR_INFO, STAIR_INFO } = this.CONSTANTS;

            // Elevator Row
            const elevatorRow = `
                <tr class="border-t">
                    <td class="p-1 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${ELEVATOR_INFO.color};"></div>${ELEVATOR_INFO.name}</td>
                    <td class="p-1 text-right">1</td>
                    <td class="p-1 text-right">---</td>
                </tr>
            `;
            this.dom.summaryTableBody.innerHTML += elevatorRow;

            // Stair Row
            if (this.state.projectData.includeStairs) {
                const stairRow = `
                    <tr class="border-t">
                        <td class="p-1 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${STAIR_INFO.color};"></div>${STAIR_INFO.name}</td>
                        <td class="p-1 text-right">2</td>
                        <td class="p-1 text-right">---</td>
                    </tr>
                `;
                this.dom.summaryTableBody.innerHTML += stairRow;
            }
        }

        this.dom.summarySection.classList.remove('hidden');
    }

    populateDetailedSummary(summary, totalSuites) {
        this.dom.detailSummaryTableBody.innerHTML = '';
        if (Object.keys(summary).length === 0 && this.state.buildingLayout.length === 0) return;
        
        const sortedSummary = Object.values(summary).sort((a,b) => a.moduleCount - b.moduleCount);
        const areaUnit = this.state.currentUnit === 'metric' ? 'm²' : 'ft²';
        const numFloors = this.state.buildingLayout.length;

        // NEW: Initialize totals
        let totalSuiteCount = 0;
        let totalModuleCount = 0;
        let totalBuildingArea = 0;

        for (const suite of sortedSummary) {
            totalSuiteCount += suite.count;
            totalModuleCount += suite.moduleTotal;
            totalBuildingArea += suite.totalArea;

            const actualPercentage = totalSuites > 0 ? ((suite.count / totalSuites) * 100).toFixed(1) : 0;
            const displayArea = this.convert(suite.totalArea, this.state.currentUnit, true);
            const moduleCodes = `${suite.codes.noCorridor} (No Corridor)<br>${suite.codes.corridor} (Corridor)`;
            
            const row = `
                <tr class="border-t">
                    <td class="p-2 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${suite.color};"></div>${suite.name}</td>
                    <td class="p-2 text-right">${suite.count}</td>
                    <td class="p-2 text-right">${suite.moduleTotal}</td>
                    <td class="p-2">${moduleCodes}</td>
                    <td class="p-2 text-right">${suite.desiredPercentage.toFixed(1)}%</td>
                    <td class="p-2 text-right">${actualPercentage}%</td>
                    <td class="p-2 text-right">${displayArea.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}</td>
                </tr>
            `;
            this.dom.detailSummaryTableBody.innerHTML += row;
        }

        if (numFloors > 0) {
            const { ELEVATOR_INFO, STAIR_INFO, MODULE_WIDTH_METRIC, SOUTH_DEPTH_METRIC, STAIR_WIDTH_METRIC, STAIR_DEPTH_METRIC } = this.CONSTANTS;
            
            const elevatorModuleCount = numFloors;
            const elevatorAreaMetric = elevatorModuleCount * (MODULE_WIDTH_METRIC * SOUTH_DEPTH_METRIC);
            totalModuleCount += elevatorModuleCount;
            totalBuildingArea += elevatorAreaMetric;

            const displayElevatorArea = this.convert(elevatorAreaMetric, this.state.currentUnit, true);
            const elevatorRow = `
                <tr class="border-t bg-gray-50">
                    <td class="p-2 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${ELEVATOR_INFO.color};"></div>${ELEVATOR_INFO.name}</td>
                    <td class="p-2 text-right">1</td>
                    <td class="p-2 text-right">${elevatorModuleCount}</td>
                    <td class="p-2">${ELEVATOR_INFO.codes.corridor}</td>
                    <td class="p-2 text-right">---</td>
                    <td class="p-2 text-right">---</td>
                    <td class="p-2 text-right">${displayElevatorArea.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}</td>
                </tr>
            `;
            this.dom.detailSummaryTableBody.innerHTML += elevatorRow;

            if (this.state.projectData.includeStairs) {
                const stairModuleCount = numFloors * 2; // Assuming each stairwell section is a "module"
                const stairAreaMetric = 2 * numFloors * (STAIR_WIDTH_METRIC * STAIR_DEPTH_METRIC);
                totalModuleCount += stairModuleCount;
                totalBuildingArea += stairAreaMetric;

                const displayStairArea = this.convert(stairAreaMetric, this.state.currentUnit, true);
                 const stairRow = `
                    <tr class="border-t bg-gray-50">
                        <td class="p-2 flex items-center"><div class="w-3 h-3 rounded-full mr-2" style="background-color: ${STAIR_INFO.color};"></div>${STAIR_INFO.name}</td>
                        <td class="p-2 text-right">2</td>
                        <td class="p-2 text-right">${stairModuleCount}</td>
                        <td class="p-2">${STAIR_INFO.codes.noCorridor}</td>
                        <td class="p-2 text-right">---</td>
                        <td class="p-2 text-right">---</td>
                        <td class="p-2 text-right">${displayStairArea.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}</td>
                    </tr>
                `;
                this.dom.detailSummaryTableBody.innerHTML += stairRow;
            }
        }

        // NEW: Add the total row
        const displayTotalArea = this.convert(totalBuildingArea, this.state.currentUnit, true);
        const totalRow = `
            <tr class="border-t-2 border-gray-800 font-bold bg-gray-100">
                <td class="p-2">Total</td>
                <td class="p-2 text-right">${totalSuiteCount}</td>
                <td class="p-2 text-right">${totalModuleCount}</td>
                <td class="p-2"></td>
                <td class="p-2 text-right"></td>
                <td class="p-2 text-right">100%</td>
                <td class="p-2 text-right">${displayTotalArea.toLocaleString(undefined, {maximumFractionDigits: 0})} ${areaUnit}</td>
            </tr>
        `;
        this.dom.detailSummaryTableBody.innerHTML += totalRow;
    }

    generateFloorThumbnails() {
        this.dom.floorThumbnailsContainer.innerHTML = '';
        if (this.state.buildingLayout.length === 0) {
            this.dom.floorThumbnailsContainer.classList.add('hidden');
            return;
        }

        const singleSideModules = this.state.buildingLayout[0].north.length;
        const thumbWidth = 80;
        const thumbHeight = 40;
        const moduleThumbWidth = thumbWidth / singleSideModules;
        const totalDepth = this.CONSTANTS.SOUTH_DEPTH_METRIC + this.CONSTANTS.NORTH_DEPTH_METRIC;
        const southThumbHeight = thumbHeight * (this.CONSTANTS.SOUTH_DEPTH_METRIC / totalDepth);
        const northThumbHeight = thumbHeight * (this.CONSTANTS.NORTH_DEPTH_METRIC / totalDepth);

        this.state.buildingLayout.forEach((floor, index) => {
            const thumbButton = document.createElement('button');
            thumbButton.className = 'floor-thumbnail p-1 bg-white rounded-md border-2 border-transparent hover:border-gray-400 transition';
            thumbButton.dataset.floorIndex = index;
            
            let svgContent = `<svg width="${thumbWidth}" height="${thumbHeight}" viewBox="0 0 ${thumbWidth} ${thumbHeight}">`;
            
            floor.south.forEach((module, i) => {
                const color = module ? module.color : '#d1d5db';
                svgContent += `<rect x="${i * moduleThumbWidth}" y="0" width="${moduleThumbWidth}" height="${southThumbHeight}" fill="${color}" stroke="#6b7280" stroke-width="0.2" />`;
            });
            floor.north.forEach((module, i) => {
                const color = module ? module.color : '#d1d5db';
                svgContent += `<rect x="${i * moduleThumbWidth}" y="${southThumbHeight}" width="${moduleThumbWidth}" height="${northThumbHeight}" fill="${color}" stroke="#6b7280" stroke-width="0.2" />`;
            });

            svgContent += `</svg>`;
            
            const label = document.createElement('span');
            label.className = 'block text-xs font-semibold mt-1';
            label.textContent = `Floor ${index + 1}`;
            
            thumbButton.innerHTML = svgContent;
            thumbButton.appendChild(label);

            thumbButton.addEventListener('click', () => {
                this.state.currentFloor2D = index;
                this.redrawViews();
            });

            this.dom.floorThumbnailsContainer.appendChild(thumbButton);
        });
        
        this.dom.floorThumbnailsContainer.classList.remove('hidden');
    }

    updateUnitSettings() {
        const { currentUnit, projectData } = this.state;
        const lenUnit = currentUnit === 'metric' ? 'm' : 'ft';
        
        this.dom.unitToggleButton.textContent = currentUnit === 'metric' ? 'Switch to Imperial' : 'Switch to Metric';
        [this.dom.widthUnit, this.dom.depthUnit, this.dom.heightUnit].forEach(el => el.textContent = lenUnit);

        // FIXED: Correctly determine the slider values based on the current unit
        const moduleWidthCurrentUnit = currentUnit === 'metric' ? this.CONSTANTS.MODULE_WIDTH_METRIC : this.convert(this.CONSTANTS.MODULE_WIDTH_METRIC, 'imperial');
        const floorHeightCurrentUnit = currentUnit === 'metric' ? projectData.floorHeight : this.convert(projectData.floorHeight, 'imperial');
        
        const configureSlider = (slider, input, min, max, step) => {
            slider.min = input.min = min;
            slider.max = input.max = max;
            slider.step = input.step = step;
        };

        configureSlider(this.dom.widthSlider, this.dom.widthInput, moduleWidthCurrentUnit, 20 * moduleWidthCurrentUnit, moduleWidthCurrentUnit); // Increased max width
        const maxHeight = currentUnit === 'metric' ? this.CONSTANTS.MAX_HEIGHT_METRIC : this.convert(this.CONSTANTS.MAX_HEIGHT_METRIC, 'imperial');
        configureSlider(this.dom.heightSlider, this.dom.heightInput, floorHeightCurrentUnit, maxHeight, floorHeightCurrentUnit);

        this.dom.floorHeightSelect.innerHTML = '';
        this.CONSTANTS.METRIC_FLOOR_HEIGHTS.forEach(h => {
            const option = document.createElement('option');
            option.value = h;
            option.textContent = currentUnit === 'metric' ? `${h.toFixed(2)} m` : this.toFtIn(this.convert(h, 'imperial'));
            this.dom.floorHeightSelect.appendChild(option);
        });
        this.dom.floorHeightSelect.value = projectData.floorHeight;
        
        this.updateViews();
    }
    
    // --- DRAWING HELPER FUNCTIONS ---

    update2DStairs(visible, x, y, planWidth, totalPlanHeight, scale) {
        const { leftStairPlan, rightStairPlan } = this.dom;
        leftStairPlan.style.display = visible ? 'block' : 'none';
        rightStairPlan.style.display = visible ? 'block' : 'none';
        if (visible) {
            const stairPlanWidth = this.CONSTANTS.STAIR_WIDTH_METRIC * scale;
            const stairPlanDepth = this.CONSTANTS.STAIR_DEPTH_METRIC * scale;
            const stairY = y + (totalPlanHeight - stairPlanDepth) / 2;
            
            const setupStair = (stairEl, stairX) => {
                stairEl.setAttribute('width', stairPlanWidth);
                stairEl.setAttribute('height', stairPlanDepth);
                stairEl.setAttribute('x', stairX);
                stairEl.setAttribute('y', stairY);
                stairEl.setAttribute('stroke', '#6b7280');
                stairEl.setAttribute('stroke-width', 0.2);
                stairEl.setAttribute('fill', this.CONSTANTS.STAIR_INFO.color);
            }
            
            setupStair(leftStairPlan, x);
            setupStair(rightStairPlan, x + planWidth + stairPlanWidth);
        }
    }

    update3DStairs(visible, mainBuildingWidth, height) {
        const existingStairs = this.three.moduleGroup.getObjectByName('stair-group');
        if(existingStairs) this.three.moduleGroup.remove(existingStairs);
        
        if (visible) {
            const stairGroup = new THREE.Group();
            stairGroup.name = 'stair-group';
            const stairGeo = new THREE.BoxGeometry(this.CONSTANTS.STAIR_WIDTH_METRIC, height, this.CONSTANTS.STAIR_DEPTH_METRIC);
            const stairMat = new THREE.MeshLambertMaterial({ color: this.CONSTANTS.STAIR_INFO.color });
            const lineMat = new THREE.LineBasicMaterial({ color: 0x6b7280 });

            const createStair = (xPos) => {
                const stairMesh = new THREE.Mesh(stairGeo, stairMat);
                stairMesh.position.set(xPos, height / 2, 0);
                const edges = new THREE.EdgesGeometry(stairMesh.geometry);
                const line = new THREE.LineSegments(edges, lineMat);
                line.position.copy(stairMesh.position);
                stairGroup.add(stairMesh, line);
            };
            
            createStair(-(mainBuildingWidth / 2) - (this.CONSTANTS.STAIR_WIDTH_METRIC / 2));
            createStair((mainBuildingWidth / 2) + (this.CONSTANTS.STAIR_WIDTH_METRIC / 2));
            
            this.three.moduleGroup.add(stairGroup);
        }
    }
    
    update2DDimensions(x, y, totalPlanWidth, totalPlanHeight, width, depth, southDepth, northDepth) {
        this.dom.dim2DElements.forEach(el => el.style.display = this.state.showDimensions ? 'block' : 'none');
        if (!this.state.showDimensions) return;

        const offset2D = 10;
        const scaleFactor = 2.2;
        const dimText = (val) => (this.state.currentUnit === 'metric' ? `${val.toFixed(1)}m` : this.toFtIn(this.convert(val, 'imperial')));
        
        const setDimLine = (line, x1, y1, x2, y2) => { line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2); };
        const setDimText = (textEl, val, x, y, rotation = 0) => {
            textEl.textContent = dimText(val);
            textEl.setAttribute('x', x);
            textEl.setAttribute('y', y);
            if (rotation) textEl.setAttribute('transform', `rotate(${rotation}, ${x}, ${y})`);
            else textEl.removeAttribute('transform');
        };
        
        // Width Dimension (bottom) - for the total visual width
        setDimLine(document.getElementById('width-dim-line'), x, y + totalPlanHeight + offset2D, x + totalPlanWidth, y + totalPlanHeight + offset2D);
        setDimText(document.getElementById('width-dim-text'), width, x + totalPlanWidth / 2, y + totalPlanHeight + offset2D + 5);

        // Total Depth Dimension (right)
        setDimLine(document.getElementById('depth-dim-line'), x + totalPlanWidth + offset2D, y, x + totalPlanWidth + offset2D, y + totalPlanHeight);
        setDimText(document.getElementById('depth-dim-text'), depth, x + totalPlanWidth + offset2D + 5, y + totalPlanHeight / 2, 90);
        
        // Depth Dimensions (left)
        const southPlanHeight = southDepth * scaleFactor;
        setDimLine(document.getElementById('south-depth-dim-line'), x - offset2D, y, x - offset2D, y + southPlanHeight);
        setDimText(document.getElementById('south-depth-dim-text'), southDepth, x - offset2D - 5, y + southPlanHeight / 2, -90);
        
        setDimLine(document.getElementById('north-depth-dim-line'), x - offset2D, y + southPlanHeight, x - offset2D, y + totalPlanHeight);
        setDimText(document.getElementById('north-depth-dim-text'), northDepth, x - offset2D - 5, y + southPlanHeight + (northDepth * scaleFactor) / 2, -90);
    }
    
    update3DDimensions(width, height, totalDepth, southDepth, northDepth, includeStairs) {
        while(this.three.dimGroup.children.length > 0){ this.three.dimGroup.remove(this.three.dimGroup.children[0]); }
        if (!this.state.showDimensions) return;
        
        const offset = 2;
        const lineMat = new THREE.LineBasicMaterial({ color: 0x374151 });
        const dimText = (val) => (this.state.currentUnit === 'metric' ? `${val.toFixed(1)}m` : this.toFtIn(this.convert(val, 'imperial')));
        const totalVisualWidth = includeStairs ? width + 2 * this.CONSTANTS.STAIR_WIDTH_METRIC : width;
        const x_start = -totalVisualWidth/2;

        const addDim = (points, text, pos) => {
            this.three.dimGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
            const sprite = this.makeTextSprite(text, {});
            sprite.position.copy(pos);
            this.three.dimGroup.add(sprite);
        };
        
        const northZ = totalDepth / 2;
        
        // Width dimension
        addDim([new THREE.Vector3(x_start, height + offset, northZ + offset), new THREE.Vector3(x_start + totalVisualWidth, height + offset, northZ + offset)], dimText(totalVisualWidth), new THREE.Vector3(0, height + offset * 2, northZ + offset));
        
        // Height dimension
        addDim([new THREE.Vector3(x_start - offset, 0, -totalDepth/2), new THREE.Vector3(x_start - offset, height, -totalDepth/2)], dimText(height), new THREE.Vector3(x_start - offset * 2, height/2, -totalDepth/2));
        
        // Depth dimensions
        const southZ_start = -totalDepth/2;
        addDim([new THREE.Vector3(x_start + totalVisualWidth + offset, height, southZ_start), new THREE.Vector3(x_start + totalVisualWidth + offset, height, southZ_start + southDepth)], dimText(southDepth), new THREE.Vector3(x_start + totalVisualWidth + offset*2, height, southZ_start + southDepth/2));
        addDim([new THREE.Vector3(x_start + totalVisualWidth + offset, height, southZ_start + southDepth), new THREE.Vector3(x_start + totalVisualWidth + offset, height, northZ)], dimText(northDepth), new THREE.Vector3(x_start + totalVisualWidth + offset*2, height, southZ_start + southDepth + northDepth/2));
    }
    
    update3DFloorLines(width, totalDepth, totalHeight, floorHeight, numFloors, includeStairs) {
        while(this.three.floorLinesGroup.children.length > 0){ this.three.floorLinesGroup.remove(this.three.floorLinesGroup.children[0]); }
        const lineMat = new THREE.LineBasicMaterial({ color: 0x356854, opacity: 0.5, transparent: true });
        
        for (let i = 1; i < numFloors; i++) {
            const y = i * floorHeight;
            if (y < totalHeight) {
                const mainPoints = [
                    new THREE.Vector3(-width/2, y, -totalDepth/2), new THREE.Vector3(width/2, y, -totalDepth/2),
                    new THREE.Vector3(width/2, y, totalDepth/2), new THREE.Vector3(-width/2, y, totalDepth/2),
                    new THREE.Vector3(-width/2, y, -totalDepth/2)
                ];
                this.three.floorLinesGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mainPoints), lineMat));
            }
        }
    };
    
    // --- UTILITY & SETUP FUNCTIONS ---

    createChart() {
        Chart.register(ChartDataLabels);
        const initialData = this.dom.suiteInputs.map(input => parseFloat(input.value));
        const colors = Object.values(this.CONSTANTS.SUITE_TYPES).map(s => s.color);
        this.suiteMixChart = new Chart(this.dom.chartCanvas.getContext('2d'), {
            type: 'pie', 
            data: { 
                labels: Object.values(this.CONSTANTS.SUITE_TYPES).map(s => s.name), 
                datasets: [{ data: initialData, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2 }] 
            },
            options: { 
                responsive: true, 
                plugins: { 
                    legend: { display: false }, 
                    datalabels: { 
                        formatter: (value, ctx) => { 
                            let sum = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); 
                            let percentage = sum > 0 ? (value * 100 / sum).toFixed(0) + "%" : "0%"; 
                            return `${ctx.chart.data.labels[ctx.dataIndex]}\n${percentage}`; 
                        }, 
                        color: '#fff', 
                        textAlign: 'center', 
                        font: { weight: 'bold', size: 12 } 
                    } 
                } 
            }
        });
    };
    
    validateSuiteMix() {
        let total = this.dom.suiteInputs.reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
        this.dom.suiteTotalPercentage.textContent = `${total.toFixed(0)}%`;
        const is100 = Math.round(total) === 100;
        this.dom.suiteTotalPercentage.classList.toggle('text-red-600', !is100);
        this.dom.suiteTotalPercentage.classList.toggle('text-green-600', is100);
        this.dom.confirmSuiteMixBtn.disabled = !is100;
    };
    
    initThree() {
        this.three.scene = new THREE.Scene(); 
        this.three.scene.background = new THREE.Color(0xf0f0f0);
        
        this.three.camera = new THREE.PerspectiveCamera(15, this.dom.threeViewContainer.clientWidth / this.dom.threeViewContainer.clientHeight, 0.1, 2000);
        this.three.camera.position.set(250, 200, 250);
        
        this.three.renderer = new THREE.WebGLRenderer({ canvas: this.dom.threeCanvas, antialias: true }); 
        this.three.renderer.setSize(this.dom.threeViewContainer.clientWidth, this.dom.threeViewContainer.clientHeight); 
        this.three.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.three.controls = new OrbitControls(this.three.camera, this.three.renderer.domElement); 
        this.three.controls.enableDamping = true;
        
        this.three.scene.add(new THREE.AmbientLight(0xffffff, 0.6)); 
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); 
        dirLight.position.set(50, 100, 20); 
        this.three.scene.add(dirLight);
        
        this.three.scene.add(new THREE.GridHelper(400, 40, 0xcccccc, 0xcccccc));
        
        this.three.moduleGroup = new THREE.Group(); 
        this.three.scene.add(this.three.moduleGroup);
        
        this.three.dimGroup = new THREE.Group(); 
        this.three.scene.add(this.three.dimGroup);
        
        this.three.floorLinesGroup = new THREE.Group(); 
        this.three.scene.add(this.three.floorLinesGroup);
        
        this.state.threeInitialized = true; 
        this.updateViews(); 
        this.animateThree();
    };
    
    animateThree() { 
        requestAnimationFrame(() => this.animateThree()); 
        if(this.three.controls) this.three.controls.update(); 
        if(this.three.renderer) this.three.renderer.render(this.three.scene, this.three.camera); 
    };

    convert(value, toUnit, isArea = false) {
        const factor = isArea ? this.CONSTANTS.SQM_TO_SQFT : this.CONSTANTS.M_TO_FT;
        if (toUnit === 'imperial') {
            return value * factor;
        }
        // This assumes the input 'value' is imperial and converts to metric
        return value / factor;
    };
    
    toFtIn(decimalFeet) {
        const feet = Math.floor(decimalFeet);
        let inches = Math.round((decimalFeet - feet) * 12);
        if (inches === 12) {
            return `${feet + 1}' 0"`;
        }
        return `${feet}' ${inches}"`;
    };

    makeTextSprite(message, opts = {}) {
        const fontface = opts.fontface || 'Inter';
        const fontsize = opts.fontsize || 18;
        const font = `bold ${fontsize}px ${fontface}`;
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        
        const metrics = context.measureText(message);
        const textWidth = metrics.width;
        canvas.width = textWidth;
        canvas.height = fontsize;
        
        context.font = font;
        context.fillStyle = 'rgba(0, 0, 0, 1.0)';
        context.fillText(message, 0, fontsize);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(textWidth / 10, fontsize / 10, 1.0);
        return sprite;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StackConfigApp();
});
