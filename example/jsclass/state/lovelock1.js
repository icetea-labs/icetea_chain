const { validate, Joi } = require(';')

@contract class Lovelock1 {

    constructor() {
        
        // Init some state
        // This make is clear what state this contract uses

        this.setState('seq', {
            lock: -1,
            memory: -1
        })
        this.setState('locks', {})
        this.setState('memories', {})
    }

    nextSeq(seqName) {
        let next
        this.setState(['seq', seqName], current => next = current + 1)

        return next
    }

    @transaction addLock(lock) {
        lock = validate(lock, Joi.object({
            name: Joi.string().required(),
            age: Joi.number().min(13)
        }))
        const id = this.nextSeq('lock')
        this.setState(['locks', id], { ...lock, owner: msg.sender })
    }

    @transaction removeLock(id: string) {
        const memoryIds = this.getMemories(id, { fields: ['id'] })
        this.deleteState('memories', memoryIds)
        this.deleteState(['locks', id])
    }

    @transaction addMemory(lockId: string, memory) {
        memory = validate(memory, Joi.object({
            text: Joi.string().required(),
            timestamp: Joi.date().timestamp()
        }))

        const id = this.nextSeq('memory')
        this.setState(['memories', id], { ...memory, lockId })
    }

    @transaction removeMemory(id: number) {
        this.deleteState(['memories', id])
    }

    @view getLocks(owner: address, options = {}) {
        const { begin, end, countMemory } = options
        const locks = this.queryState('locks', {
            filter: lock => lock.owner === owner,
            begin, end
        })

        if (countMemory) {
            locks.forEach(lock => {
                lock.memoryCount = this.countState('memories', memo => memo.lockId === lock.id)
            })
        }

        return locks
    }

    @view getMemories(lockId: string, options = {}) {
        const { begin, end } = options
        return this.queryState('memories', {
            filter: memo => memo.lockId === lockId,
            begin, end
        })
    }
}