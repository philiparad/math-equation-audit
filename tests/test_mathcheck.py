from backend.mathcheck import check_equation


def test_textbook_fraction_solution():
    result = check_equation(r'\frac{5}{x+3}+\frac{8}{x+6}=\frac{80}{(x+3)(x+6)}')
    assert result['supported']
    assert set(result['excluded']) == {'-3', '-6'}
    assert result['solutions']  # nonempty, validated candidates


def test_domain_restriction_removes_extraneous():
    result = check_equation(r'\frac{x+2}{x^{2}-5x}=\frac{3x-1}{x^{2}-25}')
    assert result['supported']
    assert set(result['excluded']) == {'0','5','-5'}


def test_basic_no_denominators():
    result=check_equation('2x+3=9')
    assert result['supported']
    assert result['solutions']==['3']
    assert not result['excluded']


def test_original_source_error_not_auto_detected():
    # The parser never claims to compare against a source image.
    result=check_equation('5x+3y=38')
    assert result['supported']
    assert 'advisory' in result['warning']


def test_unsupported_latex_is_not_executed():
    result=check_equation(r'\href{javascript:alert(1)}{x}=2')
    assert not result['supported']
    assert not result['solutions']


def test_multiple_equals_rejected():
    assert not check_equation('x=2=3')['supported']
