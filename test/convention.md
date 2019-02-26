Because test will be run by Travis every time you make Pull Request, let's follow the following convention.

1. [name].env.test.js: For tests that require both tendermint & icetea running. These tests will not be run by Travis.
2. [name].unit.test.js: For tests does not require tendermint nor icetea running. These tests will be executed by Travis.

Nevertheless, you should always run all these tests manually before submitting a Pull Request, by executing `npx jest`.