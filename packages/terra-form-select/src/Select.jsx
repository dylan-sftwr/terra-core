import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import Popup from 'terra-popup';
import Arrange from 'terra-arrange';
import IconCaretDown from 'terra-icon/lib/icon/IconCaretDown';
import 'terra-base/lib/baseStyles';
import SelectOption from './SelectOption';
import SelectMenu from './_SelectMenu';
import SelectUtils from './_SelectUtils';
import styles from './Select.scss';

const cx = classNames.bind(styles);

const propTypes = {
  /**
   * Function to trigger when the user changes the select value.
   */
  onChange: PropTypes.func,

  /**
   * Name of the select field.
   */
  name: PropTypes.string,

  /**
   * Whether the select is required or not.
   */
  required: PropTypes.bool,

  /**
   * The value to start the select on.
   */
  defaultValue: PropTypes.string,

  /**
   * The value of the select element. Use this to create a controlled input.
   */
  value: PropTypes.string,

  /**
   * Select options
   */
  children: PropTypes.node.isRequired,

  /**
   * Indicates if the select is in an invalid state.
   */
  isInvalid: PropTypes.bool,

  /**
   * Indicates if the select should be disabled.
   */
  disabled: PropTypes.bool,
};

const defaultProps = {
  onChange: undefined,
  name: null,
  required: false,
  defaultValue: undefined,
  value: undefined,
  disabled: false,
  isInvalid: false,
};

const contextTypes = {
  /* eslint-disable consistent-return */
  intl: (context) => {
    if (context.intl === undefined) {
      return new Error('Please add locale prop to Base component to load translations');
    }
  },
};

class Select extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.getInitialState = this.getInitialState.bind(this);
    this.setTargetRef = this.setTargetRef.bind(this);
    this.getTargetRef = this.getTargetRef.bind(this);
    this.handleOnClick = this.handleOnClick.bind(this);
    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.handleOnRequestClose = this.handleOnRequestClose.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
    this.wrapOnClick = this.wrapOnClick.bind(this);
    this.wrapOnKeyDown = this.wrapOnKeyDown.bind(this);
    this.state = {
      selectedValue: this.getInitialState(),
      isOpen: false,
    };
  }

  getInitialState() {
    if (!this.props.value) {
      const childArray = React.Children.toArray(this.props.children);
      for (let i = 0; i < childArray.length; i += 1) {
        const child = childArray[i];
        if (child.props.isSelected || child.props.value === this.props.defaultValue) {
          return child.props.value;
        }
      }
    }
    return '';
  }

  setTargetRef(node) {
    this.targetRef = node;
  }

  getTargetRef() {
    return this.targetRef;
  }

  wrapOnClick(option) {
    return (event) => {
      this.handleSelection(event, option);

      if (option.props.onClick) {
        option.props.onClick(event);
      }
    };
  }

  wrapOnKeyDown(option) {
    return (event) => {
      if (option.props.onKeyDown) {
        option.props.onKeyDown(event);
      }

      if (event.nativeEvent.keyCode === SelectUtils.KEYCODES.SPACE || event.nativeEvent.keyCode === SelectUtils.KEYCODES.ENTER) {
        this.handleSelection(event, option);
      } else if (event.nativeEvent.keyCode === SelectUtils.KEYCODES.UP_ARROW) {
        let previousFocus = event.target.previousSibling;
        while (previousFocus.tabIndex < 0) {
          previousFocus = previousFocus.previousSibling;
          if (!previousFocus) {
            return;
          }
        }
        previousFocus.focus();
      } else if (event.nativeEvent.keyCode === SelectUtils.KEYCODES.DOWN_ARROW) {
        let nextFocus = event.target.nextSibling;
        while (nextFocus.tabIndex < 0) {
          nextFocus = nextFocus.nextSibling;
          if (!nextFocus) {
            return;
          }
        }
        nextFocus.focus();
      }
    };
  }

  handleSelection(event, option) {
    if (this.props.onChange && option.props.value !== this.state.value) {
      this.props.onChange(event, option.props.value);
    }

    let newValue = null;
    if (!this.props.value) {
      newValue = option.props.value;
    }

    this.setState({ selectedValue: newValue, isOpen: false });
  }

  handleOnClick() {
    this.setState({ isOpen: true });
  }

  handleOnKeyDown(event) {
    if (event.nativeEvent.keyCode === SelectUtils.KEYCODES.SPACE || event.nativeEvent.keyCode === SelectUtils.KEYCODES.ENTER) {
      this.setState({ isOpen: true });
    }
  }

  handleOnRequestClose() {
    this.setState({ isOpen: false });
  }

  render() {
    const {
      onChange,
      name,
      required,
      defaultValue,
      value,
      isInvalid,
      disabled,
      children,
      ...customProps
    } = this.props;

    const { intl } = this.context;

    const attributes = Object.assign({}, customProps);
    const selectClasses = cx([
      'select',
      { invalid: isInvalid },
      { 'is-disabled': disabled },
      { open: this.state.isOpen },
      attributes.className,
    ]);

    if (required) {
      attributes['aria-required'] = 'true';
    }

    attributes.tabIndex = disabled ? '-1' : '0';
    attributes['aria-disabled'] = disabled;

    let selectedValue;
    let display;
    let defaultOption;
    let isDefaultDisplay = false;
    const clonedChildren = React.Children.map(children, (child) => {
      let isSelected = false;

      if (child.props.value === value || child.props.value === this.state.selectedValue) {
        selectedValue = child.props.value;
        display = child.props.display || child.props.children;
        isSelected = true;
      }

      return React.cloneElement(child, {
        onClick: this.wrapOnClick(child),
        onKeyDown: this.wrapOnKeyDown(child),
        isSelected,
      });
    });

    if (!selectedValue) {
      display = intl.formatMessage({ id: 'Terra.form.select.defaultDisplay' });
      selectedValue = '';
      defaultOption = <SelectOption value={selectedValue} display={display} isSelected className={cx('default-option')} />;
      isDefaultDisplay = true;
    }

    return (
      <div>
        <Popup
          contentAttachment="top left"
          targetAttachment="bottom left"
          contentHeight="auto"
          contentWidth="auto"
          onRequestClose={this.handleOnRequestClose}
          attachmentBehavior="flip"
          isOpen={this.state.isOpen}
          targetRef={this.getTargetRef}
          classNameContent={cx('select-menu')}
        >
          <SelectMenu>
            {defaultOption}
            {clonedChildren}
          </SelectMenu>
        </Popup>
        {/* eslint-disable jsx-a11y/no-static-element-interactions */}
        <div
          {...attributes}
          role="listbox"
          className={selectClasses}
          ref={this.setTargetRef}
          onClick={!disabled ? this.handleOnClick : null}
          onKeyDown={!disabled ? this.handleOnKeyDown : null}
        >
          {/* eslint-enable jsx-a11y/no-static-element-interactions */}
          <Arrange
            fill={<div className={cx(['display', { 'default-option': isDefaultDisplay }])}>{display}</div>}
            fitEnd={<IconCaretDown className={cx('select-arrow')} />}
            alignFitEnd="center"
          />
          <input type="hidden" name={name} required={required} disabled={disabled} value={selectedValue} />
        </div>
      </div>
    );
  }
}

Select.propTypes = propTypes;
Select.defaultProps = defaultProps;
Select.contextTypes = contextTypes;
Select.Option = SelectOption;

export default Select;