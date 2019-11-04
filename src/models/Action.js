const mongoose = require('mongoose')
const actions = require('../action/manager.js')
const { assocEvolve } = require('../utils.js')

const ActionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'processing', 'completed', 'rolledback', 'cancelled'],
    default: 'new'
  },
  params: Object,
  context: Object,
  result: Object,
  error: {
    perform: Object,
    rollback: Object
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

ActionSchema
  .virtual('resolved')
  .get(function () {
    return !['new', 'processing'].includes(this.status)
  })

ActionSchema
  .virtual('detail')
  .get(function () {
    const detail = { status: this.status }
    if (this.error.perform || this.error.rollback) Object.assign(detail, { error: this.error })
    if (this.result) Object.assign(detail, { result: this.result })
    return detail
  })

ActionSchema
  .virtual('implementation')
  .get(function () {
    const action = actions.find(this.name)
    if (!action) throw Error(`no implementation for action ${this.name}`)
    return actions.find(this.name)
  })

const parseError = err => Object.assign({}, {
  name: err.name,
  message: err.message
}, JSON.parse(JSON.stringify(err)))

ActionSchema.methods.start = function (data) {
  this.context = assocEvolve(this.params || {}, data)
  this.status = 'processing'
}

ActionSchema.methods.cancel = function () {
  this.status = 'cancelled'
}

ActionSchema.methods.perform = async function () {
  if (this.status !== 'processing') {
    throw Error(`bad state ${this.status}`)
  }

  try {
    const result = await this.implementation.execute(this.context)
    this.result = result
    this.status = 'completed'
  } catch (e) {
    console.error(e)
    Object.assign(this.error, { perform: parseError(e) })
  }
}

ActionSchema.methods.rollback = async function () {
  if (!['processing', 'completed'].includes(this.status)) {
    throw Error(`bad state ${this.status}`)
  }

  try {
    const prevResult = this.error.perform || this.result
    const result = await this.implementation.unexecute(this.context, prevResult)
    this.result = result
    this.status = 'rolledback'
  } catch (e) {
    console.error(e)
    Object.assign(this.error, { rollback: parseError(e) })
  }
}

module.exports = mongoose.model('action', ActionSchema)
