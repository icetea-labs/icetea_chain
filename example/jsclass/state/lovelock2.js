const { validate, stateUtil } = require(';');
const Joi = require('@hapi/joi');

const { path } = stateUtil(this)

@contract class Lovelock2 {

    locks = path('locks', {})
    memories = path('memories', {})

    @transaction addLock(lock) {
        lock = validate(lock, Joi.object({
            name: Joi.string().required(),
            age: Joi.number().min(13)
        }))
        this.locks.add({ ...lock, owner: msg.sender })
    }

    @transaction removeLock(id: string) {
        const memoryIds = this.getMemories(id, { fields: ['id'] })
        this.memories.delete(memoryIds)
        this.locks.delete(id)
    }

    @transaction addMemory(lockId: string, memory) {
        memory = validate(memory, Joi.object({
            text: Joi.string().required(),
            timestamp: Joi.date().timestamp()
        }))

        this.memories.add({ ...memory, lockId })
    }

    @transaction removeMemory(id: number) {
        this.memories.delete(id)
    }

    @view getLocks(owner: address, options = {}) {
        const { begin, end, countMemory } = options
        const locks = this.locks.query({
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

    @view getMemories(lockId: string, options = {}) {
        const { begin, end } = options
        return this.memories.query({
            filter: memo => memo.lockId === lockId,
            begin, end
        })
    }
}