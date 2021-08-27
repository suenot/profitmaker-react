import React from 'react'
import Chart from './Chart'
import Preloader from '../Preloader'
import { observer } from 'mobx-react'
import './theme.sass'
// import template from 'es6-template-strings' // TODO: remove from packages
import axios from 'axios'
import Demo from './Demo'
import WidgetNotification from '../../core_components/WidgetNotification'

@observer
export default class ChartComponent extends React.Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null,

    interval: null,
    tube: '',
    hash: '',
    data: [],
    timer: 5000,
    serverBackend: 'https://kupi.network',
    firstFetch: true,
  }

  componentDidCatch (error, info) {
    this.setState({ hasError: true, error, errorInfo: info })
  }

	render() {
    var {data} = this.state
    var demo = data
    if (this.state.hasError) {
      return <div></div>
    } else {
      var {dashboardId, widgetId} = this.props.data
      if (
        // OhlcvStore.ohlcvComputed === undefined ||
        // JSON.stringify(OhlcvStore.ohlcvComputed) === '{}' ||
        data === undefined ||
        JSON.stringify(data) === '[]' ||
        JSON.parse( JSON.stringify(data) ).length < 3 ) {
        return <Preloader />
      } else {
        var ordersJSON = JSON.parse( JSON.stringify(data) )
        ordersJSON = ordersJSON.map(function(order){
          order.date = new Date(order.date)
          return order
        })
        return (
          <div style={{height: '100%'}}>
            <Chart id={`${dashboardId}_${widgetId}_chart`} type="hybrid" data={ordersJSON} _data={this.props.data} />
            { demo && <WidgetNotification type="warning" msg="Demo mode: using test data"/> }
          </div>
        )
      }
    }
  }

  // getKey() {
  //   try {
  //     var {stock, pair, timeframe, url} = this.props.data
  //     var serverBackend = OhlcvStore.serverBackend
  //     var stockLowerCase = stock.toLowerCase()
  //     var resultUrl = template(url, { stock, stockLowerCase, pair, timeframe, serverBackend })
  //     var key = `${stock}--${pair}--${timeframe}--${resultUrl}`
  //     return key
  //   }	catch(err) { return undefined }
  // }
  async fetchOhlcv_kupi(stockLowerCase, pair, timeframe) {
    return axios.get(`${this.state.serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.state.tube = 'ccxt'
      return []
    })
  }

  async fetchOhlcv_ccxt(stockLowerCase, pair, timeframe) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchOhlcv() {
    const {stock, pair, timeframe} = this.props.data
    var stockLowerCase = stock.toLowerCase()

    var data
    if (this.state.tube === 'ccxt') {
      data = await this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe)
    } else {
      if (this.state.firstFetch) {
        data = await Promise.race([
          this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe),
          this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
        ])
        this.setState({
          firstFetch: false
        })
      } else {
        data = await this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
      }
    }
    if (this.state.hash === JSON.stringify(data)) return true
    this.setState({
      hash: JSON.stringify(data)
    })

    data = reactStockChartsComputed(data)

    this.setState({
      data: data
    })
  }

  reactStockChartsComputed(_data) {
    var data = _.cloneDeep(_data)
    data = data.map((order) => {
      return {
        'date': new Date(order[0]),
        'open': order[1],
        'high': order[2],
        'low': order[3],
        'close': order[4],
        'volume': order[5],
        'absoluteChange': '',
        'dividend': '',
        'percentChange': '',
        'split': '',
      }
    })
    return data
  }

  // reactStockChartsRender() {
  //   if (this.data.length > 3) return true
  //   else return false
  // }

  start() {
    const {demo} = this.props.data
    if (demo) {
      this.setState({
        data: this.reactStockChartsComputed(Demo)
      })
      return
    }
    this.setState({
      interval: setInterval(()=>{
        this.fetchOhlcv()
      }, this.state.timer)
    })
  }
  finish() {
    if (this.state.interval) {
      clearInterval(this.state.interval)
      this.setState({ interval: null })
    }
  }
  componentDidMount() {
    this.start()
  }
  componentWillUnmount() {
    this.finish()
  }
  // componentWillUpdate() {
  //   this.finish()
  // }
  // componentDidUpdate() {
  //   this.start()
  // }
}


