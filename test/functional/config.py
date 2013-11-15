import json


class TestConfig():
    def __init__(self):
        configFile = open('config/test.json')
        data = json.load(configFile)

        configFile.close()

        # Add calculated configuration options

        # A little longer to allow for call-setup times etc
        data['DEFAULT_WAIT_TIMEOUT'] = (
            data['PENDING_CALL_TIMEOUT'] + 2000) / 1000

        self.data = data


testConfig = TestConfig().data
