import React from 'react';

import _charts from './chart_data.json';

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight / 1.2;
let chart = _charts[0];

let RATIO = 1;
let _devicePixelRatio = devicePixelRatio;
let yScale = 1;
let xScale = 1;
let timeline_yScale = 1;
let timeline_xScale = 1;
let min_timeline_width = 10;
let intr;
// let tm;
let time_line_intr;
let ctx;
let _ctx;

const loadTypes = {
    ULTRA_PERFORMANCE: function() {
        _devicePixelRatio = 1;

        return 48;
    },
    HIGH_PERFORMANCE: function() {
        _devicePixelRatio = 2;

        return 48;
    },
    DEFAULT: function() {
        _devicePixelRatio = 2;

        return 60;
    },
    HIGH: function() {
        _devicePixelRatio = 2;

        return 100;
    },
    ULTRA: function() {
        _devicePixelRatio = 2;

        return 150;
    },
};

const charts = [
    {
        name: 'Chart #1',
        value: 0
    },
    {
        name: 'Chart #2',
        value: 1
    },
    {
        name: 'Chart #3',
        value: 2
    },
    {
        name: 'Chart #4',
        value: 3
    }, {
        name: 'Chart #5',
        value: 4
    }
];

const perfomance = [
    {
        name: 'Ultra Performance',
        value: 'ULTRA_PERFORMANCE'
    },
    {
        name: 'High Performance',
        value: 'HIGH_PERFORMANCE'
    },
    {
        name: 'Default Performance',
        value: 'DEFAULT'
    },
    {
        name: 'High load',
        value: 'HIGH'
    },
    {
        name: 'Ultra load',
        value: 'ULTRA'
    }
];

// const SCALE_TIME = 300;

let loadType = loadTypes.DEFAULT();
let scale_steps = loadType / chart.columns.length;

const edgeWidth = 4.5;
const timeline_height = SCREEN_HEIGHT / 9;
const timeline_delta_step = 1;
const _canvas = document.createElement("canvas");

export class CanvasComponent extends React.Component {
    componentDidMount() {

        if (_devicePixelRatio >= 2 && _devicePixelRatio !== RATIO) {
            this.refs.canvas.width *= 2;
            this.refs.canvas.height *= 2;

            RATIO = 2;
        }

        _canvas.width = this.refs.canvas.width;
        _canvas.height = this.refs.canvas.height;

        _ctx = _canvas.getContext('2d');
        ctx = this.refs.canvas.getContext('2d');

        ctx.setTransform(RATIO, 0, 0, RATIO, 0, 0);
        _ctx.setTransform(RATIO, 0, 0, RATIO, 0, 0);


        this.refs.canvas.style.width = SCREEN_WIDTH + 'px';
        this.refs.canvas.style.height = SCREEN_HEIGHT + 'px';

        let xAxis = [];
        let yAxis = {};

        chart.columns.forEach(axis => {
            switch (chart.types[axis[0]]) {
                case 'x':
                    xAxis = axis.slice(1, axis.length);
                    break;
                case 'line':
                    yAxis[axis[0]] = axis.slice(1, axis.length);
                    break;
                default:
                    console.log('Unknown type')
            }
        });

        min_timeline_width = Math.trunc(xAxis.length / 5);

        let max_y = 0;
        let absolute_max_y = 0;
        let yVisability = {};

        Object.keys(yAxis).forEach(key => {
            yVisability[key] = {
                value: true,
                status: 0
            };

            for (let i = 0; i < yAxis[key].length; i++) {
                if (yAxis[key][i] > max_y && i >= 0 && i <= xAxis.length - 1) max_y = yAxis[key][i];
                if (yAxis[key][i] > absolute_max_y) absolute_max_y = yAxis[key][i];
            }
        });


        yScale = max_y / (SCREEN_HEIGHT - SCREEN_HEIGHT / 10);
        xScale = (xAxis[min_timeline_width] - xAxis[0]) / 10000000 / SCREEN_WIDTH;

        timeline_xScale = (xAxis[xAxis.length - 1] - xAxis[0]) / 10000000 / SCREEN_WIDTH;
        timeline_yScale = absolute_max_y / (timeline_height - timeline_height / 10);

        this.setState({
            ctx,
            _ctx,
            xAxis,
            yAxis,
            max_y,
            absolute_max_y,
            yVisability,
            startIndex: 0,
            endIndex: min_timeline_width,
            cursorPosition: {
                x: 0,
                y: {}
            },
            cursorAxisPosition: {
                x: 0
            },
            cursorPinned: false,
            gridStepNumber: 0,
            target_yScale: yScale
        }, this.draw);
    }

    scaleChart() {
        const target_yScale = this.state.max_y / (SCREEN_HEIGHT - SCREEN_HEIGHT / 10);
        const target_timeline_yScale = this.state.absolute_max_y / (timeline_height - timeline_height / 10);
        const scale_step = Math.abs(yScale - target_yScale) / scale_steps;
        const timeline_scale_step = Math.abs(timeline_yScale - target_timeline_yScale) / scale_steps;
        const alfa_step = 1 / (Math.abs(yScale - target_yScale) / scale_step);

        xScale = (this.state.xAxis[this.state.endIndex] - this.state.xAxis[this.state.startIndex]) / 10000000 / SCREEN_WIDTH;

        if (target_yScale !== this.state.target_yScale && (yScale / target_yScale >= 1.09 || yScale / target_yScale <= 0.91)) {
            this.setState({
                target_yScale,
                last_yScale: yScale
            });

            if (yScale <= target_yScale) {
                this.upScale({
                    target_yScale,
                    scale_step,
                    timeline_scale_step,
                    alfa_step
                });
            } else if (yScale > target_yScale) {
                this.downScale({
                    target_yScale,
                    scale_step,
                    timeline_scale_step,
                    alfa_step
                });
            }
        } else {
            Object.keys(this.state.yVisability).forEach(key => {
                if (this.state.yVisability[key].value && this.state.yVisability[key].status === 2) {
                    this.setState({
                        yVisability: {
                            ...this.state.yVisability,
                            [key]: {
                                ...this.state.yVisability[key],
                                status: 0,
                                alfa: 1
                            }
                        }
                    }, this.draw);
                } else if (!this.state.yVisability[key].value && !this.state.yVisability[key].status) {
                    this.setState({
                        yVisability: {
                            ...this.state.yVisability,
                            [key]: {
                                ...this.state.yVisability[key],
                                status: 1,
                                alfa: 0
                            }
                        }
                    }, this.draw);
                }
            });

            this.draw();
        }
    }

    upScale(options) {
        const {target_yScale, alfa_step, scale_step, timeline_scale_step} = options;

        function scale() {
            yScale += scale_step;
            timeline_yScale += timeline_scale_step;

            if (yScale >= target_yScale) {
                yScale = target_yScale;

                const yVisability = this.state.yVisability;

                Object.keys(this.state.yVisability).forEach(key => {
                    if (this.state.yVisability[key].value && this.state.yVisability[key].status === 2) {
                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            status: 0,
                            alfa: 1
                        };
                    } else if (!this.state.yVisability[key].value && !this.state.yVisability[key].status) {
                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            status: 1,
                            alfa: 0
                        };
                    }
                });

                this.setState({
                    yVisability,
                    gridStepNumber: 0
                }, this.draw);

                intr = null;
            } else {
                const yVisability = this.state.yVisability;

                Object.keys(this.state.yVisability).forEach(key => {
                    if (this.state.yVisability[key].value && this.state.yVisability[key].status === 2) {
                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            alfa: this.state.yVisability[key].alfa + alfa_step
                        };
                    }
                });

                this.setState({
                    yVisability,
                    gridStepNumber: this.state.gridStepNumber - 1
                });

                this.draw();

                intr = requestAnimationFrame(scale.bind(this));
            }
        };

        if (intr) {
/*
            if (tm) {
                clearInterval(tm);
            }

            tm = setInterval(() => {
                if (!intr) {
                    intr = requestAnimationFrame(scale.bind(this));

                    clearInterval(tm);
                    tm = null;
                }
            });

            return;
*/

            cancelAnimationFrame(intr);
        }

        intr = requestAnimationFrame(scale.bind(this));
    }

    downScale(options) {
        const {target_yScale, alfa_step, scale_step, timeline_scale_step} = options;

        function scale() {
            yScale -= scale_step;
            timeline_yScale -= timeline_scale_step;

            if (yScale <= target_yScale) {
                yScale = target_yScale;

                const yVisability = this.state.yVisability;

                Object.keys(this.state.yVisability).forEach(key => {
                    if (!this.state.yVisability[key].value && !this.state.yVisability[key].status) {
                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            status: 1,
                            alfa: 0
                        }
                    }
                });

                this.setState({
                    yVisability,
                    gridStepNumber: 0
                }, this.draw);

                intr = null;
            } else {
                const yVisability = this.state.yVisability;

                Object.keys(this.state.yVisability).forEach(key => {
                    if (this.state.yVisability[key].value && this.state.yVisability[key].status === 2) {
                        const alfa = (typeof this.state.yVisability[key].alfa === 'number' ? this.state.yVisability[key].alfa : 0) + alfa_step;

                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            alfa: alfa > 0 ? alfa : 0
                        };
                    } else if (!this.state.yVisability[key].value && !this.state.yVisability[key].status) {
                        const alfa = (typeof this.state.yVisability[key].alfa === 'number' ? this.state.yVisability[key].alfa : 0) - alfa_step;

                        yVisability[key] = {
                            ...this.state.yVisability[key],
                            alfa: alfa > 0 ? alfa : 0
                        };
                    }
                });

                this.setState({
                    yVisability,
                    gridStepNumber: this.state.gridStepNumber + 1
                });

                this.draw();

                intr = requestAnimationFrame(scale.bind(this));
            }
        };

        if (intr) {
/*
            if (tm) {
                clearInterval(tm);
            }

            tm = setInterval(() => {
                if (!intr) {
                    intr = requestAnimationFrame(scale.bind(this));

                    clearInterval(tm);
                    tm = null;
                }
            });

            return;
*/
            cancelAnimationFrame(intr);
        }

        intr = requestAnimationFrame(scale.bind(this));
    }

    draw() {
        this.state._ctx.clearRect(0, 0, _canvas.width, _canvas.height);

        this.drawGrid(this.state._ctx);
        this.drawChart(this.state._ctx);
        this.drawTimeline(this.state._ctx);

        this.state.ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
        this.state.ctx.drawImage(_canvas, 0, 0, this.refs.canvas.width / RATIO, this.refs.canvas.height / RATIO);
    }

    drawGrid(ctx) {
        // ctx.font = '13px arial';
        ctx.lineWidth = 0.2;
        ctx.strokeStyle = '#acacac';
        ctx.fillStyle = '#acacac';

        if (this.state.gridStepNumber) {
            ctx.globalAlpha = this.state.gridStepNumber > 0 ? this.state.gridStepNumber / scale_steps : -this.state.gridStepNumber / scale_steps;
            ctx.beginPath();

            for (let i = this.state.target_yScale * SCREEN_HEIGHT / 5; i <= SCREEN_HEIGHT * this.state.target_yScale; i += this.state.target_yScale * SCREEN_HEIGHT / 5) {
                ctx.moveTo(0, SCREEN_HEIGHT - i / yScale);
                ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT - i / yScale);

                ctx.fillText((Math.trunc(i)).toString(), 0, SCREEN_HEIGHT - i / yScale - 10, 20);
            }
            ctx.stroke();

            ctx.globalAlpha = this.state.gridStepNumber > 0 ? 1 - this.state.gridStepNumber / scale_steps : 1 + this.state.gridStepNumber / scale_steps;
            ctx.beginPath();

            for (let i = this.state.last_yScale * SCREEN_HEIGHT / 5; i <= SCREEN_HEIGHT * this.state.last_yScale; i += this.state.last_yScale * SCREEN_HEIGHT / 5) {
                ctx.moveTo(0, SCREEN_HEIGHT - i / yScale);
                ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT - i / yScale);

                ctx.fillText((Math.trunc(i)).toString(), 0, SCREEN_HEIGHT - i / yScale - 10, 20);
            }

            ctx.stroke();

            ctx.globalAlpha = 1;

            ctx.beginPath();

            ctx.moveTo(0, SCREEN_HEIGHT);
            ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT);

            ctx.stroke();

            ctx.fillText('0', 0, SCREEN_HEIGHT - 10, 20);
        } else {
            ctx.beginPath();

            for (let i = 0; i <= SCREEN_HEIGHT * yScale; i += yScale * SCREEN_HEIGHT / 5) {
                ctx.moveTo(0, SCREEN_HEIGHT - i / yScale);
                ctx.lineTo(SCREEN_WIDTH, SCREEN_HEIGHT - i / yScale);

                ctx.fillText((Math.trunc(i)).toString(), 0, SCREEN_HEIGHT - i / yScale - 10, 20);
            }

            ctx.stroke();
        }

        ctx.closePath();

        const _a = Math.trunc((this.state.endIndex - this.state.startIndex) / 5);


        for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
            if (i !== 0 && i % Math.trunc(_a) === 3) {
                ctx.fillText((new Date(this.state.xAxis[i])).toString().slice(4, 10), (this.state.xAxis[i] - this.state.xAxis[this.state.startIndex]) / 10000000 / xScale - 15, SCREEN_HEIGHT + 20, 30);
            }
        }

    }

    drawChart(ctx) {
        // ctx.font = '14px arial';
        const target_lineWidth = 220 / (this.state.endIndex - this.state.startIndex);

        if (target_lineWidth > 2.5) {
            ctx.lineWidth = 2.5;
        } else if (target_lineWidth < 1) {
            ctx.lineWidth = 1.2;
        } else {
            ctx.lineWidth = target_lineWidth;
        }

        const keys = Object.keys(this.state.yAxis);

        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];

            if (this.state.yVisability[key].value || !this.state.yVisability[key].status) {
                ctx.strokeStyle = chart.colors[key];

                if (typeof this.state.yVisability[key].alfa === 'number') {
                    ctx.globalAlpha = this.state.yVisability[key].alfa;
                }

                ctx.beginPath();

                for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
                    const x = Math.floor((this.state.xAxis[i] - this.state.xAxis[this.state.startIndex]) / 10000000 / xScale);
                    const y = Math.floor(SCREEN_HEIGHT - this.state.yAxis[key][i] / yScale);
                    ctx[i === 0 ? 'moveTo' : 'lineTo'].apply(ctx, [x, y]);
                }

                ctx.stroke();
                ctx.closePath();

                ctx.globalAlpha = 1;
            }
        }
    }

    drawTimeline(ctx) {
        let region = new Path2D();

        region.rect(0, SCREEN_HEIGHT + 50, SCREEN_WIDTH, timeline_height);

        ctx.save();
        ctx.clip(region);

        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ddeaf3';
        ctx.lineWidth = edgeWidth;
        ctx.strokeRect((this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale + edgeWidth / 2, SCREEN_HEIGHT + 49, (this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale - (this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale - edgeWidth, timeline_height + 2);

        ctx.globalAlpha = 1;
        ctx.lineWidth = 0.7;

        const keys = Object.keys(this.state.yAxis);
        for (let j = 0; j < keys.length; j++) {
            let key = keys[j];

            if (this.state.yVisability[key].value || !this.state.yVisability[key].status) {
                ctx.strokeStyle = chart.colors[key];

                if (typeof this.state.yVisability[key].alfa === 'number') ctx.globalAlpha = this.state.yVisability[key].alfa;
                ctx.beginPath();

                for (let i = 0; i < this.state.xAxis.length; i++) {
                    const x = Math.floor((this.state.xAxis[i] - this.state.xAxis[0]) / 10000000 / timeline_xScale);
                    const y = Math.floor(SCREEN_HEIGHT + 50 + timeline_height - this.state.yAxis[key][i] / timeline_yScale);

                    ctx[i === 0 ? 'moveTo' : 'lineTo'].apply(ctx, [x, y]);
                }

                ctx.stroke();

                ctx.globalAlpha = 1;
            }
        }

        ctx.closePath();

        ctx.fillStyle = '#f5f9fb';
        ctx.globalAlpha = .8;
        ctx.fillRect(0, SCREEN_HEIGHT + 50, (this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale, timeline_height);
        ctx.fillRect((this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale, SCREEN_HEIGHT + 50, SCREEN_WIDTH - (this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale, timeline_height);

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    drawCursor(ctx) {
        ctx.font = '16px arial';
        ctx.strokeStyle = '#acacac';

        ctx.lineWidth = 0.5;
        ctx.beginPath();

        ctx.moveTo(this.state.cursorPosition.x, 0);
        ctx.lineTo(this.state.cursorPosition.x, SCREEN_HEIGHT);

        ctx.stroke();

        ctx.closePath();

        /*
                ctx.shadowColor = '#acacac';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 3;

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.state.cursorPosition.x - 90, SCREEN_HEIGHT / 7, 150, 100);

                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                ctx.strokeRect(this.state.cursorPosition.x - 90, SCREEN_HEIGHT / 7, 150, 100)


                ctx.fillStyle = '#acacac';
        */
        //ctx.fillText(new Date(this.state.cursorPosition.x * xScale * 10000000 + this.state.xAxis[0]).toString().slice(0, 10), this.state.cursorPosition.x - 90, SCREEN_HEIGHT / 5, 200);

        const target_lineWidth = 220 / (this.state.endIndex - this.state.startIndex);

        if (target_lineWidth > 2.5) {
            ctx.lineWidth = 2.5;
        } else if (target_lineWidth < 1) {
            ctx.lineWidth = 1.2;
        } else {
            ctx.lineWidth = target_lineWidth;
        }
        ctx.fillStyle = '#ffffff';

        Object.keys(this.state.cursorPosition.y).forEach(key => {
            if (this.state.yVisability[key].value) {
                ctx.beginPath();

                // ctx.font = '20px arial';
                // ctx.fillStyle = chart.colors[key];
                // ctx.fillText(this.state.cursorAxisPosition.y[key], this.state.cursorPosition.x - 45 * (i + 1), SCREEN_HEIGHT / 5 + 50, 300);

                ctx.strokeStyle = chart.colors[key];

                ctx.moveTo(this.state.cursorPosition.x + 5, this.state.cursorPosition.y[key]);
                ctx.arc(this.state.cursorPosition.x, this.state.cursorPosition.y[key], 5, 0, 2 * Math.PI);

                ctx.fill();
                ctx.stroke();
            }
        });

        ctx.closePath();
    }

    mouseDownHandler(e) {
        e.stopPropagation();

        const pos = this.getMousePos(this.refs.canvas, e);

        if (pos.y > SCREEN_HEIGHT + 50) {
            this.setState({
                cursorPinned: false
            });
        }

        if (pos.y > SCREEN_HEIGHT + 50 &&
            pos.x > (this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale + 7 &&
            pos.x < (this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale - 7) {

            this.setState({
                dragSelect: true,
                mousePosition: this.getTimelineCursorPosition(e)
            });
        } else if (pos.y > SCREEN_HEIGHT + 50 &&
            pos.x > (this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale &&
            pos.x < (this.state.xAxis[this.state.startIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale + 7
        ) {
            this.setState({
                dragLeftEdge: true,
                mousePosition: this.getTimelineCursorPosition(e)
            });
        } else if (pos.y > SCREEN_HEIGHT + 50 &&
            pos.x > (this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale - 7 &&
            pos.x < (this.state.xAxis[this.state.endIndex] - this.state.xAxis[0]) / 10000000 / timeline_xScale) {
            this.setState({
                dragRightEdge: true,
                mousePosition: this.getTimelineCursorPosition(e)
            });
        }
    }

    mouseUpHandler(e) {
        e.stopPropagation();

        const pos = this.getMousePos(this.refs.canvas, e);

        if (pos.y > SCREEN_HEIGHT + 50 && !this.state.dragSelect && !this.state.dragLeftEdge && !this.state.dragRightEdge) {
            const cursorPosition = this.getTimelineCursorPosition(e);

            const width = this.state.endIndex - this.state.startIndex;
            const hWidth = Math.trunc(width / 2);

            const target_startIndex = cursorPosition.xIndex - hWidth > 0 ? cursorPosition.xIndex - hWidth < this.state.xAxis.length - 1 - width ? cursorPosition.xIndex - hWidth : this.state.xAxis.length - 1 - width : 0;
            const target_endIndex = cursorPosition.xIndex + hWidth < this.state.xAxis.length - 1 ? cursorPosition.xIndex + hWidth > width ? cursorPosition.xIndex + hWidth : width : this.state.xAxis.length - 1;

            if (time_line_intr) clearInterval(time_line_intr);

            const delta = Math.trunc(this.state.xAxis.length / 50);

            time_line_intr = setInterval(() => {
                let _startIndex = this.state.startIndex;
                let _endIndex = this.state.endIndex;

                if (this.state.startIndex !== target_startIndex) {
                    const deltaStart = target_startIndex - this.state.startIndex;

                    let modStartIndex = target_startIndex;

                    if (deltaStart > 0) {
                        modStartIndex = (this.state.startIndex + delta) > target_startIndex ? target_startIndex : this.state.startIndex + delta;
                    } else {
                        modStartIndex = (this.state.startIndex - delta) < target_startIndex ? target_startIndex : this.state.startIndex - delta;
                    }

                    _startIndex = modStartIndex;
                }

                if (this.state.endIndex !== target_endIndex) {
                    const deltaEnd = target_endIndex - this.state.endIndex;

                    let modEndIndex = target_endIndex;

                    if (deltaEnd > 0) {
                        modEndIndex = (this.state.endIndex + delta) > target_endIndex ? target_endIndex : this.state.endIndex + delta;
                    } else {
                        modEndIndex = (this.state.endIndex - delta) < target_endIndex ? target_endIndex : this.state.endIndex - delta;
                    }

                    _endIndex = modEndIndex;
                }

                if (this.state.startIndex === target_startIndex && this.state.endIndex === target_endIndex) {
                    clearInterval(time_line_intr);
                    this.calcMaxYAxisValue();
                } else {
                    this.setState({
                        startIndex: _startIndex,
                        endIndex: _endIndex
                    }, this.draw);
                }
            });
        }

        this.setState({
            dragSelect: false,
            dragLeftEdge: false,
            dragRightEdge: false
        });
    }

    mouseMoveHandler(e) {
        e.stopPropagation();

        const pos = this.getMousePos(this.refs.canvas, e);

        if (pos.y > SCREEN_HEIGHT + 50) {
            const cursorPosition = this.getTimelineCursorPosition(e);

            if (!cursorPosition) return;

            if (this.state.dragSelect) {
                const d2 = 112 / this.state.xAxis.length;
                const d = this.state.xAxis.length / 130;
                const d1 = SCREEN_WIDTH / 185 / d;

                const delta = Math.trunc((cursorPosition.x - this.state.mousePosition.x) / (d2 + d1));

                if (delta > timeline_delta_step) {
                    this.setState({
                        startIndex: this.state.endIndex + delta < this.state.xAxis.length - 1 ? this.state.startIndex + delta : this.state.startIndex + this.state.xAxis.length - 1 - this.state.endIndex,
                        endIndex: this.state.endIndex + delta < this.state.xAxis.length - 1 ? this.state.endIndex + delta : this.state.xAxis.length - 1,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                } else if (delta < -timeline_delta_step) {
                    this.setState({
                        startIndex: this.state.startIndex > -delta ? this.state.startIndex + delta : 0,
                        endIndex: this.state.startIndex > -delta ? this.state.endIndex + delta : this.state.endIndex - this.state.startIndex,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                }
            } else if (this.state.dragLeftEdge) {
                const d2 = 112 / this.state.xAxis.length;
                const d = this.state.xAxis.length / 130;
                const d1 = SCREEN_WIDTH / 185 / d;

                const delta = Math.trunc((cursorPosition.x - this.state.mousePosition.x) / (d2 + d1));

                if (delta > timeline_delta_step) {
                    this.setState({
                        startIndex: this.state.startIndex + delta < this.state.endIndex - min_timeline_width ? this.state.startIndex + delta : this.state.endIndex - min_timeline_width,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                } else if (delta < -timeline_delta_step) {
                    this.setState({
                        startIndex: this.state.startIndex > -delta ? this.state.startIndex + delta : 0,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                }
            } else if (this.state.dragRightEdge) {
                const d2 = 112 / this.state.xAxis.length;
                const d = this.state.xAxis.length / 130;
                const d1 = SCREEN_WIDTH / 185 / d;

                const delta = Math.trunc((cursorPosition.x - this.state.mousePosition.x) / (d2 + d1));

                if (delta > timeline_delta_step) {
                    this.setState({
                        endIndex: this.state.endIndex + delta < this.state.xAxis.length - 1 ? this.state.endIndex + delta : this.state.xAxis.length - 1,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                } else if (delta < -timeline_delta_step) {
                    this.setState({
                        endIndex: this.state.endIndex + delta > this.state.startIndex + min_timeline_width ? this.state.endIndex + delta : this.state.startIndex + min_timeline_width,
                        mousePosition: cursorPosition
                    }, this.calcMaxYAxisValue);
                }
            }
        } else if (!this.state.cursorPinned) {
            const cursorPosition = this.getCursorPosition(e);

            if (!cursorPosition) return;

            this.state.ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
            this.state.ctx.drawImage(_canvas, 0, 0, _canvas.width / RATIO, _canvas.height / RATIO);

            this.setState({
                cursorPosition
            }, this.drawCursor.bind(this, this.state.ctx));
        }
    }

    canvasLeaveHandler(e) {
        e.stopPropagation();

        if (!this.state.cursorPinned) {
            this.state.ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
            this.state.ctx.drawImage(_canvas, 0, 0, _canvas.width / RATIO, _canvas.height / RATIO);
        }

        this.setState({
            dragSelect: false,
            dragLeftEdge: false,
            dragRightEdge: false
        });
    }

    calcMaxYAxisValue() {
        let max_y = 0;
        let absolute_max_y = 0;

        const keys = Object.keys(this.state.yAxis);

        for (let j = 0; j < keys.length; j++) {
            const key = keys[j];

            if (this.state.yVisability[key].value) {
                for (let i = 0; i < this.state.yAxis[key].length; i++) {
                    if (i <= this.state.endIndex && i >= this.state.startIndex && this.state.yAxis[key][i] > max_y) max_y = this.state.yAxis[key][i];
                    if (this.state.yAxis[key][i] > absolute_max_y) absolute_max_y = this.state.yAxis[key][i];
                }
            }
        }

        this.setState({
            max_y: max_y || this.state.max_y,
            absolute_max_y: absolute_max_y || this.state.absolute_max_y
        }, this.scaleChart);
    }

    getMousePos(canvas, e) {
        const rect = canvas.getBoundingClientRect();

        return {
            // eslint-disable-next-line
            x: (typeof e.clientX !== undefined && e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0) - rect.left) / (rect.right - rect.left) * canvas.width / RATIO,
            // eslint-disable-next-line
            y: (typeof e.clientY !== undefined && e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0) - rect.top) / (rect.bottom - rect.top) * canvas.height / RATIO
        };
    }

    getTimelineCursorPosition(e) {
        const pos = this.getMousePos(this.refs.canvas, e);

        if (pos.x >= this.refs.canvas.width / RATIO || pos.y > this.refs.canvas.height / RATIO || pos.y < SCREEN_HEIGHT + 50) return;

        let real_x = pos.x * 10000000 * timeline_xScale + this.state.xAxis[0];
        let appr_x = real_x;
        let xIndex = 0;

        for (let i = 0; i < this.state.xAxis.length; i++) {
            if (typeof this.state.xAxis[i] === 'number' && real_x > this.state.xAxis[i]) {
                appr_x = !this.state.xAxis[i + 1] || real_x - this.state.xAxis[i] < this.state.xAxis[i + 1] - real_x ? this.state.xAxis[i] : this.state.xAxis[i + 1];
                xIndex = i;
            }
        }

        return {
            x: (appr_x - this.state.xAxis[0]) / 10000000 / timeline_xScale,
            xIndex
        };
    }

    getCursorPosition(e) {
        const pos = this.getMousePos(this.refs.canvas, e);

        if (pos.x >= this.refs.canvas.width / RATIO || pos.y > this.refs.canvas.height / RATIO || pos.y >= SCREEN_HEIGHT) return;

        let real_x = pos.x * 10000000 * xScale + this.state.xAxis[this.state.startIndex];
        let appr_x = real_x;
        let appr_y = {};

        for (let i = 0; i < this.state.xAxis.length; i++) {
            if (typeof this.state.xAxis[i] === 'number' && real_x > this.state.xAxis[i] && i >= this.state.startIndex && i <= this.state.endIndex) {
                appr_x = !this.state.xAxis[i + 1] || real_x - this.state.xAxis[i] < this.state.xAxis[i + 1] - real_x ? this.state.xAxis[i] : this.state.xAxis[i + 1];

                const keys = Object.keys(this.state.yAxis);
                for (let j = 0; j < keys.length; j++) {
                    appr_y[keys[j]] = this.state.yAxis[keys[j]][this.state.xAxis[i] === appr_x ? i : i + 1];
                }
            }
        }

        this.setState({
            cursorAxisPosition: {
                y: appr_y
            }
        });

        return {
            x: (appr_x - this.state.xAxis[this.state.startIndex]) / 10000000 / xScale,
            y: (function () {
                const result = {};

                Object.keys(appr_y).forEach(key => {
                    result[key] = SCREEN_HEIGHT - appr_y[key] / yScale
                });

                return result;
            })()
        };
    }

    buttonClickHandler(key, e) {
        e.preventDefault();
        e.stopPropagation();

        this.setState({
            yVisability: {
                ...this.state.yVisability,
                [key]: {
                    value: !this.state.yVisability[key].value,
                    status: this.state.yVisability[key].value ? 0 : 2,
                    alfa: this.state.yVisability[key].value ? 1 : 0
                }
            }
        }, this.calcMaxYAxisValue);
    }

    canvasClickHandler(e) {
        e.stopPropagation();

        const pos = this.getMousePos(this.refs.canvas, e);
        if (pos.y > SCREEN_HEIGHT + 50) return;

        if (!this.state.cursorPinned) {
            this.setState({
                cursorPinned: true
            });
        } else {
            const target_position = this.getCursorPosition(e);

            if (!target_position || pos.y > SCREEN_HEIGHT + 50) return;

            const cursor_step = Math.abs(target_position.x - this.state.cursorPosition.x) / 150;

            if (this.state.cursorPosition.x < target_position.x) {
                if (intr) clearInterval(intr);

                intr = setInterval(() => {
                    this.state.ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
                    this.state.ctx.drawImage(_canvas, 0, 0, _canvas.width / RATIO, _canvas.height / RATIO);

                    if (this.state.cursorPosition.x < target_position.x) {
                        this.setState({
                            cursorPosition: {
                                x: this.state.cursorPosition.x + cursor_step,
                                y: {}
                            }
                        }, this.drawCursor.bind(this, this.state.ctx));
                    } else {
                        this.setState({
                            cursorPosition: target_position,
                            cursorPinned: false
                        }, this.drawCursor.bind(this, this.state.ctx));

                        clearInterval(intr);
                    }
                });
            } else if (this.state.cursorPosition.x > target_position.x) {
                if (intr) clearInterval(intr);

                intr = setInterval(() => {
                    this.state.ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
                    this.state.ctx.drawImage(_canvas, 0, 0, _canvas.width / RATIO, _canvas.height / RATIO);

                    if (this.state.cursorPosition.x > target_position.x) {
                        this.setState({
                            cursorPosition: {
                                x: this.state.cursorPosition.x - cursor_step,
                                y: {}
                            }
                        }, this.drawCursor.bind(this, this.state.ctx));
                    } else {
                        this.setState({
                            cursorPosition: target_position,
                            cursorPinned: false
                        }, this.drawCursor.bind(this, this.state.ctx));

                        clearInterval(intr);
                    }
                });
            } else {
                this.setState({
                    cursorPinned: false
                });
            }
        }
    }

    selectChartHandler(e) {
        chart = _charts[e.target.value];

        let xAxis = [];
        let yAxis = {};

        chart.columns.forEach(axis => {
            switch (chart.types[axis[0]]) {
                case 'x':
                    xAxis = axis.slice(1, axis.length);
                    break;
                case 'line':
                    yAxis[axis[0]] = axis.slice(1, axis.length);
                    break;
                default:
                    console.log('Unknown type')
            }
        });

        min_timeline_width = Math.trunc(xAxis.length / 5);

        let max_y = 0;
        let absolute_max_y = 0;
        let yVisability = {};

        Object.keys(yAxis).forEach(key => {
            yVisability[key] = {
                value: true,
                status: 0
            };

            for (let i = 0; i < yAxis[key].length; i++) {
                if (yAxis[key][i] > max_y && i >= 0 && i <= xAxis.length - 1) max_y = yAxis[key][i];
                if (yAxis[key][i] > absolute_max_y) absolute_max_y = yAxis[key][i];
            }
        });


        yScale = max_y / (SCREEN_HEIGHT - SCREEN_HEIGHT / 10);
        xScale = (xAxis[min_timeline_width] - xAxis[0]) / 10000000 / SCREEN_WIDTH;

        timeline_xScale = (xAxis[xAxis.length - 1] - xAxis[0]) / 10000000 / SCREEN_WIDTH;
        timeline_yScale = absolute_max_y / (timeline_height - timeline_height / 10);

        this.setState({
            ctx,
            _ctx,
            xAxis,
            yAxis,
            max_y,
            absolute_max_y,
            yVisability,
            startIndex: 0,
            endIndex: min_timeline_width,
            cursorPosition: {
                x: 0,
                y: {}
            },
            cursorAxisPosition: {
                x: 0
            },
            cursorPinned: false,
            gridStepNumber: 0,
            target_yScale: yScale
        }, this.draw);

    }

    selectPerfHandler(e) {
        loadType = loadTypes[e.target.value].call(null);

        if (_devicePixelRatio >= 2 && _devicePixelRatio !== RATIO) {
            this.refs.canvas.width *= 2;
            this.refs.canvas.height *= 2;

            RATIO = 2;

            _canvas.width = this.refs.canvas.width;
            _canvas.height = this.refs.canvas.height;

            ctx = this.refs.canvas.getContext('2d');
            _ctx = _canvas.getContext('2d');
            ctx.setTransform(2, 0, 0, 2, 0, 0);
            _ctx.setTransform(2, 0, 0, 2, 0, 0);
        } else if (_devicePixelRatio === 1 && _devicePixelRatio !== RATIO) {

            this.refs.canvas.width /= 2;
            this.refs.canvas.height /= 2;

            RATIO = 1;

            _canvas.width = this.refs.canvas.width;
            _canvas.height = this.refs.canvas.height;
            ctx = this.refs.canvas.getContext('2d');
            _ctx = _canvas.getContext('2d');
            //ctx.setTransform(2, 0, 0, 2, 0, 0);
            //_ctx.setTransform(2, 0, 0, 2, 0, 0);
        }

        scale_steps = loadType / chart.columns.length;

        this.setState({
            ctx: ctx,
            _ctx: _ctx
        }, this.draw);
    }

    renderButtons() {
        return this.state ?
            Object.keys(this.state.yAxis).map(key =>
                <button key={key} onClick={this.buttonClickHandler.bind(this, key)}>{key}</button>) :
            [];
    }

    renderOptions() {
        return perfomance.map(option =>
                <option key={option.name} value={option.value}>{option.name}</option>);
    }

    renderChartsOptions() {
        return charts.map(option =>
            <option key={option.name} value={option.value}>{option.name}</option>);
    }

    render() {
        return (
            <div>
                <canvas ref="canvas"
                        width={SCREEN_WIDTH}
                        height={SCREEN_HEIGHT + 50 + SCREEN_HEIGHT / 6}
                        onMouseMove={this.mouseMoveHandler.bind(this)}
                        onClick={this.canvasClickHandler.bind(this)}
                        onMouseLeave={this.canvasLeaveHandler.bind(this)}
                        onMouseDown={this.mouseDownHandler.bind(this)}
                        onMouseUp={this.mouseUpHandler.bind(this)}
                        onTouchStart={this.mouseDownHandler.bind(this)}
                        onTouchEnd={this.mouseUpHandler.bind(this)}
                        onTouchMove={this.mouseMoveHandler.bind(this)}
                />

                <div>
                    {this.renderButtons()}
                    <select defaultValue='DEFAULT' onChange={this.selectPerfHandler.bind(this)}>
                        {this.renderOptions()}
                    </select>
                    <select defaultValue={0} onChange={this.selectChartHandler.bind(this)}>
                        {this.renderChartsOptions()}
                    </select>
                </div>

            </div>
        );
    }
}

