@contract class CallOffchain {
    @transaction ask() {
        const contract = loadContract('system.gate');
        contract.request.invokeUpdate('lottery')
    }

    @transaction onOffchainData(data) {
        return data
    }
}