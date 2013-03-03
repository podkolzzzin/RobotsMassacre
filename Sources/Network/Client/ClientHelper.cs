using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Net.Sockets;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Robots_Massacre_Client;
using Inventory;
using Level;
using Entity.Particle.Bonus;
using Gui;
using Entity;

namespace Network
{
	public partial class GameClient
	{
		private static IPAddress _selfIp;
		public static IPAddress SelfIP
		{
			get
			{
				return _getSelfIp();
			}
		}
		private static IPAddress _getSelfIp()
		{
			if (_selfIp == null)
			{
				IPHostEntry host;
				IPAddress currentIp = null;
				host = Dns.GetHostEntry(Dns.GetHostName());

				foreach (IPAddress ip in host.AddressList)
				{
					if (ip.AddressFamily.ToString() == "InterNetwork")
					{
						currentIp = ip;
					}
				}
				_selfIp = currentIp;
				return _selfIp;
			}
			else
			{
				return _selfIp;
			}
		}

		public const int CLIENT_PORT = 9090;
		public bool IsConnected { get; set; }
		public int PlayerId
		{
			get
			{
				return _playerId;
			}
		}
		public bool IsMain { get { return _isMain; } }

		private int _playerId;

		internal bool _isMain;
		internal List<IPEndPoint> _connections = new List<IPEndPoint>();

		private void _broadcast(byte[] data)
		{
			for (int i = 0; i < _connections.Count; i++)
			{
				if (_connections[i] == null)
					continue;
				if (_connections[i].Address.Address == CIp.Address && _connections[i].Port == CPort)
					continue;
				lock (_client)
					_client.Send(data, data.Length, _connections[i]);
			}
		}


		private Bonus _createBonus(int bId, BonusType type, int bx, int by)
		{
			Bonus b = null;
			switch (type)
			{
				case BonusType.Acceleration:
					b = new Acceleration(bx, by);
					break;
				case BonusType.APBullets:
					b = new APBullets(bx, by);
					break;
				case BonusType.BigAmmo:
					b = new BigAmmo(bx, by);
					break;
				case BonusType.BigMedChest:
					b = new BigMedChest(bx, by);
					break;
				case BonusType.DispenserBonus:
					b = new DispenserBonus(bx, by);
					break;
				case BonusType.Invulnerability:
					b = new Invulnerability(bx, by);
					break;
				case BonusType.MineBonus:
					b = new MineBonus(bx, by);
					break;
				case BonusType.SmallAmmo:
					b = new SmallAmmo(bx, by);
					break;
				case BonusType.SmallMedChest:
					b = new SmallMedChest(bx, by);
					break;
				case BonusType.TurretBonus:
					b = new TurretBonus(bx, by);
					break;
				case BonusType.Unknown:
					throw new ArgumentException("unknown bonus type came from client ");
			}
			b.Id = bId;
			return b;
		}

		private GEntity _createInvItem(InvType invType)
		{
			switch (invType)
			{
				case InvType.Dispenser:
					return new Dispenser(0, 0, 0);
				case InvType.Mine:
					return new Mine(0, 0, 0);
				case InvType.Turret:
					return new Turret(0, 0, 0);
			}
			return null;
		}
	}
}