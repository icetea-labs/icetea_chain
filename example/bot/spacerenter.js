@contract class SpaceRenter {
    @state @view renters = []
    @state @view admins = []

    constructor() {
        this.admins.push(this.deployedBy)
    }

    expectAdmin() {
        if (!this.admins.includes(msg.sender)) {
            throw new Error('Unauthorized')
        }
    }

    @transaction exportState(path) {
        this.expectAdmin()
        if (path != null) return this.getState(path, {})

        return this.getStateKeys().reduce((p, k) => {
            p[k] = this.getState(k)
            return p
        }, {})
    }

    @transaction addAdmin(addr: address) {
        this.expectAdmin()
        this.admins.push(addr)
    }

    expectRenter(errorMessage) {
        if (!this.renters.includes(msg.sender)) {
            throw new Error(errorMessage || 'Unauthorized')
        }
    }

    @transaction addRenter(renter: address) {
        this.expectAdmin()
        this.renters.push(renter)
    }

    @transaction setOnlyRenter(renter: address) {
        this.expectAdmin()
        this.renters = [renter]
    }

    _getState(namespace, name, defaultValue) {
        const errorMsg = 'getExternalState must be called from a renter contract.'
        if (!msg.sender) {
            throw new Error(errorMsg)
        }
        // The following function will throw if msg.sender is not a contract
        // This is still not enough though, as a caller can fake

        this.runtime.getContractInfo(msg.sender, errorMsg)
        this.expectRenter(errorMsg)

        if (!Array.isArray(name)) name = [name]
        return this.getState([namespace, ...name], defaultValue)
    }

    _setState(namespace, name, value) {
        this.expectRenter()
        if (!Array.isArray(name)) name = [name]
        return this.setState([namespace, ...name], value)
    }

    @view getLocalState(name, defaultValue) {
        return this._getState(msg.sender, name, defaultValue)
    }

    @transaction setLocalState(name, value) {
        return this._setState(msg.sender, name, value)
    }

    @view getGlobalState(name, defaultValue) {
        return this._getState('shared', name, defaultValue)
    }

    @transaction setGlobalState(name, value) {
        return this._setState('shared', name, value)
    }
}