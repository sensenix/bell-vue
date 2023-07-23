<template>
  <div class="container-fluid">

    <div id="app">

      <v-app id="inspire">
        <splitpanes class="default-theme">
          <pane size="30">

            <div style="overflow-y:scroll;overflow-x:hidden;height:100vh;">

            <v-treeview ref="maintree"
                :active.sync="active"
                :items="items"
                :load-children="fetchChildren"
                :open.sync="open"
                dense
                activatable
                return-object
                transition
                @update:active="onSelectNode"
            >
              <template v-slot:prepend="{ item, open }">
                <v-icon v-if="item.children">
                  {{ open ? 'mdi-folder-open' : 'mdi-folder' }}
                </v-icon>
                <v-icon v-else>
                  {{ classes[item.nodetype] }}
                </v-icon>
              </template>

              <template v-slot:append="{ item, open }">
                <v-btn v-on:click.stop="doStop" v-if="selected.nodetype && active.length > 0 && item.id === active[0].id" x-small fab plain class="button-refresh" @click="onRefreshClick()"><v-icon>mdi-refresh</v-icon></v-btn>
              </template>

            </v-treeview>
            </div>
          </pane>
          <pane>
            <header style="height:34px; line-height:34px; background-color:#e6eeff;">
              <h4 v-if="selected.nodetype" style="margin:5px; text-align:left;">{{rightpane_hdr}}<v-btn v-if="false && selected.nodetype" x-small fab plain class="button-refresh" @click="onRefreshClick()"><v-icon>mdi-refresh-circle</v-icon></v-btn>
              </h4>
            </header>

            <hollow-dots-spinner v-if="working"
                :animation-duration="1300"
                :dot-size="10"
                :dots-num="3"
                color="#8087bd"
            />

            <div v-if="rightpane_text"><pre>{{rightpane_text}}</pre></div>
            <div v-if="selected.nodetype === 'html'" v-html="rightpane_html" style="background-color:#F2F4F4;overflow-y:scroll;overflow-x:scroll;height:100vh;"></div>

            <div ref="mainTabulator" v-if="selected.nodetype === 'table'"></div>

            <line-chart height="700px" v-if="selected.nodetype === 'chart' && charttype === 'Line' && chartloaded" :chart-data="chartdata" :options="chartoptions"></line-chart>
            <bar-chart height="700px" v-if="selected.nodetype === 'chart' && charttype === 'Bar' && chartloaded" :chart-data="chartdata" :options="chartoptions"></bar-chart>

            <p></p>
            <v-btn v-if="selected.nodetype==='file'"
                   depressed
                   color="primary"
                   @click="onDownloadClick()">Download</v-btn>

            <hollow-dots-spinner v-if="dnlWorking"
                                 :animation-duration="1300"
                                 :dot-size="10"
                                 :dots-num="3"
                                 color="#8087bd"
                                 class="dnl-spinner"
            />
            <div v-if="selected.nodetype === 'file' && rightpane_dnlstatus"><pre>{{rightpane_dnlstatus}}</pre></div>
          </pane>
        </splitpanes>
      </v-app>

    </div>
  </div>
</template>

<style>
.v-btn {
  margin: 1rem;
}
.hollow-dots-spinner {
  margin: 0.5rem;
}
.dnl-spinner {
  margin: 0.8rem;
}
.button-refresh {
  margin: 0rem;
  float: left;
}
.button-refresh:focus {
  outline: 0;
}
h4 {
  margin: 5px;
  text-align: left;
  height: 34px;
  line-height: 34px;
  vertical-align: middle;
}
</style>

<script>
import LineChart from './LineChart.js'
import BarChart from './BarChart.js'
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { HollowDotsSpinner } from 'epic-spinners'
import DataService from '../services/data.service'
import {TabulatorFull as Tabulator} from 'tabulator-tables';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

export default {
  name: 'BellTree',
  components: {
    Splitpanes, Pane, LineChart, BarChart, HollowDotsSpinner
  },

  data: () => ({
    active: [],
    open: [],
    chld: [],

    lastOpen: [],

    classes: {
      html: 'mdi-language-html5',
      chart: ' mdi-chart-areaspline',
      table: ' mdi-table-large',
      text: ' mdi-card-text-outline',
      file: 'mdi-download'
    },

    rightpane_html: '',
    rightpane_text: '',
    rightpane_hdr: '',
    rightpane_dnlstatus: '',
    working: false,
    dnlWorking: false,

    chartdata: {labels: [],
                datasets: []},

    chartoptions: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: true,
        text: ''
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: ''
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: ''
          },
          ticks: {
            beginAtZero: true
          }
        }]

      }
    },

    chartloaded: false,
    charttype: 'Line',

    tabulator: null,
    tableData: [],
    tableColumns: [],
  }),

  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },

    loggedIn() {
      return this.$store.state.auth.status.loggedIn;
    },

    items () {
      let user = JSON.parse(localStorage.getItem('user'));
      if (user && user.rootItems) {
        for (var i = 0; i < user.rootItems.length; i++) {
            if (user.rootItems[i].nodetype === 'folder') {
              user.rootItems[i].children = this.chld;
            }
        }
        return user.rootItems
      } else {
        return []
      }
    },

    selectedNode () {
      if (!this.active.length) {
        return null
      }
      return this.active[0]
    },

    selected () {
      if (!this.active.length) {
        return {id: '0', name: 'no active', nodetype: ''}
      }
      return {id: this.active[0].id, name: this.active[0].name, nodetype: this.active[0].nodetype}
    },
  },

  watch: {
    selected: 'reserved',
  },

  methods: {

    async fetchChildren (item) {
      await pause(10)

      return DataService.expand(item)
          .then(response => {
              // eslint-disable-next-line no-console
              console.log('Expand response', response.data);
              return response.data })
          .then(json => { item.children.push(...json)
                        })
          .catch(err => { if (err.response.status === 401) {
                            this.$router.push('/login');
                          } else {
                            this.rightpane_text = '>' + err.response.data
                          }
                        })
    },

    onSelectNode(node) {
      // eslint-disable-next-line no-console
      console.log('select node', node)
      this.rightpane_hdr = node[0].name
      this.rightpane_text = ''
      this.rightpane_html = ''
      this.rightpane_dnlstatus = ''
      this.chartloaded = false
      this.working = true
      this.dnlWorking = false

      if (node[0].nodetype === 'html') {
        DataService.getContent(node[0])
            .then(response => {
                // eslint-disable-next-line no-console
                // console.log('Get content response', response.data);
                return response.data})
            .then(html => { this.working = false
                            this.rightpane_text = ''
                            this.rightpane_html = html })
            .catch(err => { this.working = false
                            if (err.response.status === 401) {
                              this.$router.push('/login');
                            } else {
                              this.rightpane_text = '>' + err.response.data
                            }
                          })

      } else if (node[0].nodetype === 'text') {
        DataService.getContent(node[0])
            .then(response => response.data)
            .then(text => { this.working = false
                            this.rightpane_text = text
            })
            .catch(err => { this.working = false
                            if (err.response.status === 401) {
                              this.$router.push('/login');
                            } else {
                              this.rightpane_text = '>' + err.response.data
                            }
                          })

      } else if (node[0].nodetype === 'file') {
        this.working = false
        // No actions here, file will be downloaded with button

      } else if (node[0].nodetype === 'chart') {
        DataService.getContent(node[0])
            .then(response => response.data)
            .then(text => { let retData = this.prepareChartData(text)
                            this.chartdata = retData
                            this.working = false
                            this.rightpane_text = ''
                            this.chartloaded = true
            })
            .catch(err => { this.working = false
                            if (err.response.status === 401) {
                              this.$router.push('/login');
                            } else {
                              this.rightpane_text = '>' + err.response.data
                            }
                          })

      } else if (node[0].nodetype === 'table') {
        DataService.getContent(node[0])
            .then(response => response.data)
            .then(text => { let retData = this.prepareTableData(text)
              this.tableData = retData.data
              this.tableColumns = retData.columns
              this.working = false
              this.rightpane_text = ''

              let options = {
                data: this.tableData,
                columns: this.tableColumns,
              }

              if (retData.tableOptions != null) {
                for (var opt in retData.tableOptions) {
                  options[opt] = retData.tableOptions[opt]
                }
              }

              this.tabulator = new Tabulator(this.$refs.mainTabulator, options);

              // eslint-disable-next-line no-console
              //console.log('TABULATOR CREATED', options, this.tableColumns, this.tableData)
            })
            .catch(err => {
              // eslint-disable-next-line no-console
              console.log('ERROR', err)

              this.working = false

              if (err.hasOwnProperty('response') && err.response.status === 401) {
                this.$router.push('/login');
              } else {
                this.rightpane_text = '>' + (err.hasOwnProperty('response') ? err.response.data : err)
              }
            })

      } else if (node[0].nodetype === 'folder') {
        this.working = false

      } else if (node[0].nodetype === 'empty') {
        this.working = false

      } else if (node[0].nodetype != 'folder') {
        this.working = false
        this.rightpane_text = '>Unknown node type: ' + node[0].nodetype
      } else {
        this.working = false
      }

    },

    forceFileDownload(response) {
      let delimIndex = response.data.indexOf('@')
      if (delimIndex > 0) {
        const url = window.URL.createObjectURL(new Blob([response.data.substring(delimIndex + 1)]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', response.data.substring(0, delimIndex)) //or any other extension
        document.body.appendChild(link)
        link.click()
      }
    },

    onRefreshClick() {
      this.working = true
      if (this.selected.nodetype === 'folder') {
        this.working = false
        while( this.active[0].children.length > 0) { this.active[0].children.pop() }
        this.updateChildrenInItems(this, this.items, this.active[0].id)

        let i = 0;
        this.lastOpen = this.open;
        while (i < this.open.length) {
          if (this.open[i].id === this.active[0].id) {
            this.open.splice(i, 1);
          } else {
            ++i;
          }
        }

        let nodes = this.$refs.maintree.nodes;
        if (nodes[this.active[0].id].vnode) {
          nodes[this.active[0].id].vnode.hasLoaded = false
        }
        this.$refs.maintree.updateVnodeState(this.active[0].id)

      } else if (this.active[0]) {
        this.onSelectNode(this.active)

      }
    },

    updateChildrenInItems(me, currentArray, id) {
      currentArray.forEach(element => {
        if (element.id === id) {
          while( element.children.length > 0) { element.children.pop() }
        }
        if (element.children != undefined &&
            element.children != null &&
            element.children.length > 0
        ) {
          me.updateChildrenInItems(me, element.children, id);
        }
      });
    },

    onDownloadClick() {
      this.dnlWorking = true
      DataService.getContent(this.selectedNode)
          .then(response => { this.forceFileDownload(response)
                              this.dnlWorking = false
                              this.rightpane_html = ''
                              this.rightpane_text = ''
                              this.rightpane_dnlstatus = ''
          })
          .catch(err => { this.dnlWorking = false
                          if (err.response.status === 401) {
                            this.$router.push('/login');
                          } else {
                            this.rightpane_dnlstatus = '>' + err.response.data
                          }
                        })
    },

    doStop() {
    },

    prepareChartData(data) {

      /*
        # line 1: chart params
        # line 2: chart title
        # line 3: title for x axis
        # line 4 title for Y axis
        # line 5: headers, col 1 is always time or date/time
        # csv data
        @'
        Line,fill,nozero
        Dummy chart
        Day time
        Number of IOps
        Datetime,Reads,Writes
        2021-03-15T22:53:46,0,0
        2021-03-15T23:53:46,1,4
       */

      let dts = []
      let lbl = []
      let colors = ['#0000ff','#ff0000', '#33cc33', '#9900ff', '#996633', '#ff9933']
      let fillMode = false
      let tension = 0

      let arr = data.split('\n')
      for (var i = 0; i < arr.length; i++) {
        let arrItem = arr[i].replace(/\r$/, '')
        if (i == 0) {
          // Chart params
          let paramsStr = ',' + arrItem.toLowerCase() + ','
          if (paramsStr.includes(',line,')) {
            this.charttype = 'Line'
          }
          if (paramsStr.includes(',bar,')) {
            this.charttype = 'Bar'
          }
          if (paramsStr.includes(',fill,')) {
            fillMode = true
          }
          if (paramsStr.includes(',nozero,')) {
            this.chartoptions.scales.yAxes[0].ticks.beginAtZero = false
          }
          if (paramsStr.includes(',smoothed,')) {
            tension = 0.4
          }
          if (paramsStr.includes(',aspect,')) {
            this.chartoptions.maintainAspectRatio = true
          }
        }
        if (i == 1) {
          // Chart title
          this.chartoptions.title.text = arrItem
        }
        if (i == 2) {
          // X Title
          this.chartoptions.scales.xAxes[0].scaleLabel.labelString = arrItem
        }
        if (i == 3) {
          // Y Title
          this.chartoptions.scales.yAxes[0].scaleLabel.labelString = arrItem
        }
        if (i == 4) {
          let a4 = arrItem.split(',')
          a4.forEach(function (item, index) {
            if (index > 0) {
              dts.push({
                label: item,
                backgroundColor: colors[index-1],
                fill: fillMode,
                lineTension: tension,
                data: []
              })
            }
          });
        }
        if (i >= 5) {
          let a5 = arrItem.split(',')
          a5.forEach(function (item, index) {
            if (index == 0) {
              lbl.push(item)
            }
            if (index > 0) {
              dts[index-1].data.push(item)
            }
          });
        }
      }

      return {labels: lbl,
              datasets: dts}
      /*
      Chart data:
      {
        labels: ['2021-03-15T22:53:46', '2021-03-15T23:53:46', '2021-03-16T00:53:46', '2021-03-16T01:53:46'
        ],
        datasets: [
          {
            label: 'Data One',
            backgroundColor: '#f87979',
            data: [this.getRandomInt(), this.getRandomInt(), this.getRandomInt(), this.getRandomInt()]
          }, {
            label: 'Data Two',
            backgroundColor: '#a87754',
            data: [this.getRandomInt(), this.getRandomInt(), this.getRandomInt(), this.getRandomInt()]
          }
        ]
      }
      */

    },

    prepareTableData(data) {

      /*
        # line 1: table properties
        # line 2: title
        # line 3: field1>field properties
        # line 4: field2>field properties
        # line ..: field3>field properties
        # line ..: column headers
        # csv data
        @'
        "maxHeight"=300,"movableColumns"=true
        Sample table title
        <qry>"formatter":"textarea","width":400,"frozen":true
        Query|Datetime|Reads|Writes
        select 1|2021-03-15T22:53:46|0|0
        select 2|2021-03-15T23:53:46|1|4
       */

      let tableTitle = ''
      let dts = []
      let cols = []
      let tableOptions = null
      let fieldsProps = {}
      let fieldsNames = []
      let delim = '|'
      let isData = false
      let dataRowNum = 0

      let arr = data.split('\n')
      for (var i = 0; i < arr.length; i++) {
        let arrItem = arr[i].replace(/\r$/, '')

        // eslint-disable-next-line no-console
        //console.log('ResultSet>', i, arrItem)

        if (i == 0) {
          // Table options
          if (arrItem && arrItem !== 'std') {
            let options = '{' + arrItem + '}'
            // eslint-disable-next-line no-console
            //console.log('Table options', options)
            tableOptions = JSON.parse(options)
          }
          continue
        }

        if (i == 1) {
          // Title
          tableTitle = arrItem
          continue
        }

        // Column properties
        let idx1 = arrItem.indexOf('<')
        let idx2 = arrItem.indexOf('>')
        if (!isData && i >= 2 && idx1 >= 0 && idx2 > 0) {
          let fld = arrItem.substring(idx1 + 1, idx2).trim()

          if (this.isAlphanumeric(fld)) {
            fieldsProps[fld] = arrItem.substring(idx2 + 1)
            continue
          }
        }

        if (i >= 2 && !isData) {
          // Columns first
          // [ { title: "Date Of Birth", field: "dob", hozAlign: "center" }, ... ]
          let a3 = arrItem.split(delim)
          a3.forEach( (item, index) => {
            if (index >= 0) {
              let field = item.indexOf('__') >= 0 ? item.substring(item.indexOf('__') + 2) : 'col' + index
              let title = item.indexOf('__') >= 0 ? item.substring(0, item.indexOf('__')) : item
              fieldsNames.push(field)
              let col = { title: title,
                          field: field,
                          formatter: function(cell) {
                            // Colors in data:
                            // {fore/back}
                            // {fore}
                            let value = cell.getValue().trim()
                            let idx1 = value.indexOf("{")
                            let idx2 = value.indexOf("}")
                            if (idx1 == 0 && idx2 >= 0) {
                              let color = value.substring(idx1 + 1, idx2)
                              let fore = 'color:' + color + ';';
                              let back = '';
                              if (color.indexOf('/') >= 0) {
                                fore = 'color:' + color.substring(0, color.indexOf('/')) + ';'
                                back = 'background-color:' + color.substring(color.indexOf('/') + 1) + ';'
                              }
                              return "<span style='" + fore + back + "'>" + value.substring(idx2 + 1) + "</span>"
                            } else {
                              return value;
                            }
                          }
              }
              let extraPropStr = fieldsProps.hasOwnProperty(field) ? fieldsProps[field] : ''
              if (extraPropStr) {
                col = { ...col, ...JSON.parse('{' + extraPropStr + '}') }
              }
              cols.push(col)
            }
          });
          isData = true
          continue
        }

        if (isData) {
          // Data
          // [ {id:4, name:"Brendon Philips", age:"125", col:"orange", dob:"01/08/1980"}, ... ]
          let a4 = arrItem.split(delim)
          let row = {}
          a4.forEach( (item, index) => {
            if (dataRowNum == 0 && this.isNumeric(item)) {
              // Automatically align numeric to right
              if (!cols[index].hasOwnProperty("hozAlign")) {
                cols[index]["hozAlign"] = "right"
              }
            }
            row[fieldsNames[index]] = item.replaceAll('~N~', '\r\n')
          });
          dts.push(row)
          dataRowNum++
        }
      }
      // eslint-disable-next-line no-console
      //console.log('Table data', cols, dts)
      return {tableTitle: tableTitle, tableOptions: tableOptions, columns: cols, data: dts}
    },

    reserved () {
    },

    isAlphanumeric(str) {
      return /^[a-zA-Z0-9_]+$/.test(str);
    },

    isNumeric(str) {
      let occurDots = (str.match(/[.,]/g)||[]).length
      if (occurDots > 1) {
        return false
      }
      return /^[0-9,.]+$/.test(str);
    },

  },

   mounted() {
     if (!this.currentUser || !this.loggedIn) {
       this.$router.push('/login');
     }
  }
};
</script>
