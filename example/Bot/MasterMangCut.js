
/*

send([
    { type: 'text', content: 'hello'},
    { type: button, content: [{text: 'x', value: 'y'}]},
    { type: input, content: 'place holder' },
    { type: select, content: }
])

*/

@contract class MasterMangCut {

    #STAGE = {
        UNSTARTED: 'Unstarted', // did not talk to each other
        STARTED: 'Started', // started, next: show them terms
        ACCEPTED: 'Terms', // term accepted, next: ask for name
        HAD_NAME: 'Name', // had name, next: ask for gender
        HAD_GENDER: 'Gender', // had gender, next: ask for dob
        HAD_DOB: 'Dob', // had dob, next: ask hour
        HAD_HOUR: 'Hour', // had hour, next: show them result
        SHOWN_RESULT: 'Result' // result shown, should show Restart button
    }

    #map = {
        [this.#STAGE.STARTED]: {
            ask() {

            }
        }
    }

    @state #conversations = {}

    #askTerms() {

    }
    
    #askName() {

    }

    #collectName(text) {
        this.name = text
    }

    #askGender() {

    }

    #collectGender(state, text) {
        export(['male', 'female'].includes(text), "Gender must be either 'male' or 'female'.")
        state.gender = (text === 'male')
    }

    #askDob() {

    }

    #collectDoB(state, text) {

    }

    #askHour() {

    }

    #showResult() {

    }

    #stateMap = {
        [STAGE.UNSTARTED]: this.#showTerms,

    }

    #proceed(state, text) {

        // set collect data to state
        const currentStage = state.stage
        state[stage] = text

        // 

        return this.#stateMap[state]call(this, text)
    }

    info() {
        return {
            spec_version: '1.0', // version of the bot spec
            bot_version: '1.0', // the version of this bot
            name: 'Thầy Măng Cụt',
            description: 'Thầy Măng Cụt biết nhiều thứ, nhưng ông chỉ nói đủ.'
        }
    }

    @transaction ontext(text: string) {
        const who = msg.sender
        const cons = this.#conversations
        if (!cons[who]) {
            cons[who] = {
                stage: STATE.STARTED
            }
        }
        this.#proceed(cons[who].stage, text)
    }
}