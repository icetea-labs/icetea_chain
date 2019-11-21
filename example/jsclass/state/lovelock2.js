const { validate, stateUtil } = require(';');
const Joi = require('@hapi/joi');

const { path } = stateUtil(this)

// some helpers
const makeLockHelper = (contract, { validate, Joi }) => {
    return {
        addLock(lock) {
            lock = validate(lock, Joi.object({
                name: Joi.string().required(),
                age: Joi.number().min(13)
            }))
            contract.locks.add({ ...lock, owner: contract.runtime.msg.sender })
        },

        removeLock(id) {
            const memoryIds = this.getMemories(id, { fields: ['id'] })
            contract.memories.delete(memoryIds)
            contract.locks.delete(id)
        },

        getLocks(owner, options = {}) {
            const { begin, end, countMemory } = options
            const locks = contract.locks.query({
                filter: lock => lock.owner === owner,
                begin, end
            })

            if (countMemory) {
                locks.forEach(lock => {
                    lock.memoryCount = this.memories.count(memo => memo.lockId === lock.id)
                })
            }

            return locks
        }
    }
}

const makeMemoryHelper = (contract, { validate, Joi }) => {
    return {
        addMemory(lockId, memory) {
            memory = validate(memory, Joi.object({
                text: Joi.string().required(),
                timestamp: Joi.date().timestamp()
            }))

            contract.memories.add({ ...memory, lockId })
        },

        removeMemory(id) {
            contract.memories.delete(id)
        },

        getMemories(lockId, options = {}) {
            const { begin, end } = options
            return contract.memories.query({
                filter: memo => memo.lockId === lockId,
                begin, end
            })
        }
    }
}

@contract class Lovelock {

    locks = path('locks', {})
    memories = path('memories', {})
    lockHelper = makeLockHelper(this, { validate, Joi })
    memoryHelper = makeMemoryHelper(this, { validate, Joi })

    @transaction addLock(lock) {
        return this.lockHelper.addLock(lock)
    }

    @transaction removeLock(id: string) {
        return this.lockHelper.removeLock(id)
    }

    @transaction addMemory(lockId: string, memory) {
        return this.memoryHelper.addMemory(lockId, memory)
    }

    @transaction removeMemory(id: number) {
        return this.memoryHelper.removeMemory(id)
    }

    @view getLocks(owner: address, options) {
        return this.lockHelper.getLocks(owner, options)
    }

    @view getMemories(lockId: string, options) {
        return this.memoryHelper.getMemories(lockId, options)
    }
}