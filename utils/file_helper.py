import toml


class TomlHelper:
    def __init__(self, toml_filename):
        self.t_dict = dict()
        self.toml_file_path = toml_filename

    def update(self, t_data):
        self.t_dict.update(t_data)
        return self.t_dict

    def write(self, t_data):
        with open(self.toml_file_path, "w", encoding="utf-8") as fs:
            toml.dump(t_data, fs)

    def read(self):
        with open(self.toml_file_path, "r", encoding="utf-8") as fs:
            t_data = toml.load(fs)
        return t_data

    def read_str(self, s_data):
        t_data = toml.loads(s_data, _dict=dict)
        return t_data

    def read_dict(self, dict):
        t_data = toml.dumps(dict)
        return t_data
