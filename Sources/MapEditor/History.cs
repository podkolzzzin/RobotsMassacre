using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MapEditing
{
	class HistoryElement
	{
		public MapClipboard Clipboard;
		public int X, Y;
		public HistoryElement(MapClipboard c, int x, int y)
		{
			X = x;
			Y = y;
			Clipboard = c;
		}
	}

	class History
	{
		private MapEditor _parent;
		private List<HistoryElement> Actions;
		private Stack<HistoryElement> RedoActions;
		private int _current;
		public History(MapEditor parent)
		{
			Actions = new List<HistoryElement>();
			RedoActions = new Stack<HistoryElement>();
			_parent = parent;
		}

		public void Add(int x, int y, int w, int h)
		{
			MapClipboard t = new MapClipboard(_parent);
			t.Width = w;
			t.Height = h;
			t.Copy(x, y);
			if (_current == Actions.Count)
				Actions.Add(new HistoryElement(t, x, y));
			else
			{
				Actions.RemoveRange(_current, Actions.Count - _current);
				Actions.Add(new HistoryElement(t, x, y));
			}
			_current = Actions.Count;
			RedoActions.Clear();
		}

		public void Undo()
		{
			if (_current > 0)
			{
				_current--;
				MapClipboard r = new MapClipboard(_parent);
				r.Width = Actions[_current].Clipboard.Width;
				r.Height = Actions[_current].Clipboard.Height;
				r.Copy(Actions[_current].X, Actions[_current].Y);
				RedoActions.Push(new HistoryElement(r, Actions[_current].X, Actions[_current].Y));


				Actions[_current].Clipboard.Paste(Actions[_current].X, Actions[_current].Y);
			}

		}

		public void Redo()
		{
			if (RedoActions.Count > 0)
			{
				var elem = RedoActions.Pop();
				elem.Clipboard.Paste(elem.X, elem.Y);
				_current++;
			}
		}
	}
}