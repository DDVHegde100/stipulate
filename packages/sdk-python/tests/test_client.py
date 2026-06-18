from stipulate.client import StipulateClient, StipulateError


def test_client_exports():
    assert StipulateClient is not None
    assert StipulateError is not None
